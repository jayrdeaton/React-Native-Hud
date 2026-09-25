import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { useEffect, useRef, useState } from 'react'
import { BackHandler, type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Portal, Text } from 'react-native-paper'
import { useReducedMotion } from 'react-native-reanimated'

import { getOverlayCardColors, overlayActionStyles, overlayStyles } from '../overlayCard'
import type { GuideRotation, GuideStep } from './types'

// The overlay's own breathing room and the card's own inner padding. Together with the card's max
// width these fix the width of one page exactly, which the paging ScrollView below needs up front (it
// snaps to multiples of it) rather than measuring after layout.
const OVERLAY_GUTTER = 24
const CARD_PADDING = 24
const MAX_CARD_WIDTH = 360
// A quarter-turned card has the phone's long edge to spread across, so it's allowed wider: shorter
// lines mean fewer of them, which is what actually has to fit (see sizing below).
const MAX_CARD_WIDTH_TURNED = 520
const ART_HEIGHT = 132
// Below this much usable height the illustration box shrinks. Sized so the full card (padding, art,
// title, two lines of body, dots, buttons) fits a 360pt-wide phone held sideways.
const COMPACT_BELOW = 480
const ART_HEIGHT_COMPACT = 88

// Where the card has to fit. The fleet's rotation is FAKE: the OS window stays portrait and the card
// is only turned with a transform, so a quarter-turned card's on-screen width is its layout HEIGHT,
// which must fit the window's short edge, and its on-screen height is its layout width. Sizing it
// against the unswapped window (what the first version did) let a sideways card run off a small
// phone. Exported for tests.
export function getGuideCardSize(windowWidth: number, windowHeight: number, rotation: GuideRotation) {
  const turned = rotation === 90 || rotation === -90
  const availableWidth = (turned ? windowHeight : windowWidth) - OVERLAY_GUTTER * 2
  const availableHeight = (turned ? windowWidth : windowHeight) - OVERLAY_GUTTER * 2
  const width = Math.min(turned ? MAX_CARD_WIDTH_TURNED : MAX_CARD_WIDTH, availableWidth)
  return {
    width,
    pageWidth: width - CARD_PADDING * 2,
    maxHeight: availableHeight,
    artHeight: availableHeight < COMPACT_BELOW ? ART_HEIGHT_COMPACT : ART_HEIGHT
  }
}

export interface HowToPlayDialogProps {
  visible: boolean
  steps: GuideStep[]
  // Last card's primary button.
  onFinish: () => void
  // Skip (first card only — see the action row), and Android's hardware back button — both mean "I don't need this", so a caller persisting
  // "seen" should treat them exactly like onFinish.
  onSkip: () => void
  // The app's live fake-landscape rotation (see GuideRotation). Portal content escapes any rotated
  // ancestor, so the card rotates itself, and sizes itself for the turn (see getGuideCardSize).
  rotation?: GuideRotation
}

type CardProps = Omit<HowToPlayDialogProps, 'visible'>

function HowToPlayCard({ steps, onFinish, onSkip, rotation = 0 }: CardProps) {
  const { dark, colors } = useAutoPaperTheme()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const reducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  // Android's hardware back would otherwise fall through to the router underneath and pop a screen
  // (or exit the app) with the guide still up. Treated as Skip, the same as the on-screen button.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onSkip()
      return true
    })
    return () => subscription.remove()
  }, [onSkip])

  const { fg, cardBg, cardBorder, fgMuted } = getOverlayCardColors(dark)
  const { width: cardWidth, pageWidth, maxHeight, artHeight } = getGuideCardSize(windowWidth, windowHeight, rotation)
  const rotationStyle = rotation === 0 ? undefined : { transform: [{ rotate: `${rotation}deg` }] }
  const isFirst = index === 0
  const isLast = index === steps.length - 1
  const isOnly = steps.length === 1
  const artBackground = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'

  // The page a Next/Back tap is animating to, while it's on its way. An animated scrollTo emits every
  // offset in between through onScroll, and without this the dots and buttons would flip back to the
  // page being left for the first half of the animation.
  const targetRef = useRef<number | null>(null)

  function goTo(next: number) {
    targetRef.current = next
    setIndex(next)
    scrollRef.current?.scrollTo({ x: next * pageWidth, animated: !reducedMotion })
  }

  // Keeps the dots and buttons in step with a swipe (or a trackpad scroll on web). onScroll, not only
  // onMomentumScrollEnd: react-native-web never fires the momentum events, so on web a swipe moved the
  // cards while the dots and buttons stayed on the old page (Jay spotted it in Solitaire). The index
  // follows whichever page is more than half in view, the same moment a native pager's dots change.
  function syncToOffset(offsetX: number) {
    const page = Math.round(offsetX / pageWidth)
    if (page < 0 || page >= steps.length) return
    if (targetRef.current !== null) {
      if (page === targetRef.current) targetRef.current = null
      return
    }
    setIndex(page)
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    syncToOffset(e.nativeEvent.contentOffset.x)
  }

  // Native's settle event: also clears a pending target, in case the animation was interrupted by a
  // drag before it reached its page.
  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    targetRef.current = null
    syncToOffset(e.nativeEvent.contentOffset.x)
  }

  return (
    <Portal>
      <View style={[overlayStyles.overlay, styles.overlay]}>
        <View accessibilityViewIsModal style={[overlayStyles.card, styles.card, { width: cardWidth, maxHeight, backgroundColor: cardBg, borderColor: cardBorder }, rotationStyle]}>
          {/* The pager shrinks (flexShrink) when the card hits maxHeight, and each page is its own
            vertical ScrollView, so a page that still doesn't fit (a long translation, large text)
            scrolls instead of being clipped. In the normal case nothing scrolls. */}
          <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16} onMomentumScrollEnd={handleMomentumEnd} style={[styles.pager, { width: pageWidth }]}>
            {steps.map((step, i) => (
              <ScrollView key={i} nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ width: pageWidth }} contentContainerStyle={styles.page}>
                {step.art !== undefined && <View style={[styles.art, { height: artHeight, backgroundColor: artBackground }]}>{step.art}</View>}
                <Text variant='headlineSmall' style={[styles.title, { color: fg }]}>
                  {step.title}
                </Text>
                <Text variant='bodyMedium' style={[styles.body, { color: fg }]}>
                  {step.body}
                </Text>
              </ScrollView>
            ))}
          </ScrollView>

          {steps.length > 1 && (
            <View accessible accessibilityLabel={`Step ${index + 1} of ${steps.length}`} style={styles.dots}>
              {steps.map((_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: i === index ? colors.primary : fgMuted }]} />
              ))}
            </View>
          )}

          {/* ConfirmDialog's exact row (see overlayActionStyles): outlined secondary on the left,
            contained primary on the right. Skip and Back share the one secondary slot — three
            full-size buttons don't fit side by side at the row's 128 minimum — so Skip is only
            offered on the first card; after that the way out is Next to the end (a short flow) or
            Android's hardware back, which skips from anywhere. */}
          <View style={overlayActionStyles.actions}>
            {!isOnly && (
              <Button mode='outlined' onPress={isFirst ? onSkip : () => goTo(index - 1)} style={overlayActionStyles.actionButton}>
                {isFirst ? 'Skip' : 'Back'}
              </Button>
            )}
            <Button mode='contained' onPress={isLast ? onFinish : () => goTo(index + 1)} style={isOnly ? overlayActionStyles.actionButtonSingle : overlayActionStyles.actionButton} buttonColor={colors.primary} textColor={colors.onPrimary}>
              {isLast ? 'Ready' : 'Next'}
            </Button>
          </View>
        </View>
      </View>
    </Portal>
  )
}

// A short, skippable, paged "how to play" card — the one shared shape every fleet game's intro takes,
// built on the same retro overlay-card look as ConfirmDialog (see overlayCard.ts) so it reads as
// part of the same family. Controlled and presentational: whether it's visible, and what happens on
// finish/skip (persisting "seen", mostly), is the caller's — see GuideProvider for the wiring nearly
// every app wants. Buttons are the primary way through; the paging ScrollView underneath is what
// makes a swipe work too, with no gesture-handler dependency.
//
// Split into an outer visibility gate and an inner card so the card's own page index is created
// fresh every time it opens — a replay from Settings always starts on the first card, with no
// effect needed to reset it.
export function HowToPlayDialog({ visible, steps, ...rest }: HowToPlayDialogProps) {
  if (!visible || steps.length === 0) return null
  return <HowToPlayCard steps={steps} {...rest} />
}

const styles = StyleSheet.create({
  art: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%'
  },
  body: {
    textAlign: 'center'
  },
  // Additive on top of overlayCard's own shared `card` shape — its default 32px padding is tighter
  // here (a paged card wants more width for its art) and the shared 16px gap is right.
  card: {
    padding: CARD_PADDING
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  dots: {
    flexDirection: 'row',
    gap: 8
  },
  overlay: {
    paddingHorizontal: OVERLAY_GUTTER
  },
  page: {
    alignItems: 'center',
    gap: 12
  },
  pager: {
    flexShrink: 1
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center'
  }
})
