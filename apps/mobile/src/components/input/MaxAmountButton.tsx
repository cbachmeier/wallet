import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleProp, ViewStyle } from 'react-native'
import Trace from 'src/components/Trace/Trace'
import { ElementName } from 'src/features/telemetry/constants'
import { maxAmountSpend } from 'src/utils/balance'
import { Text, TouchableArea } from 'ui/src'
import { FEATURE_FLAGS } from 'wallet/src/features/experiments/constants'
import { useFeatureFlag } from 'wallet/src/features/experiments/hooks'

interface MaxAmountButtonProps {
  currencyAmount: CurrencyAmount<Currency> | null | undefined
  currencyBalance: CurrencyAmount<Currency> | null | undefined
  onSetMax: (amount: string) => void
  style?: StyleProp<ViewStyle>
}

export function MaxAmountButton({
  currencyAmount,
  currencyBalance,
  onSetMax,
  style,
}: MaxAmountButtonProps): JSX.Element {
  const { t } = useTranslation()

  const maxInputAmount = maxAmountSpend(currencyBalance)

  // Disable max button if max already set or when balance is not sufficient
  const disableMaxButton =
    !maxInputAmount ||
    !maxInputAmount.greaterThan(0) ||
    currencyAmount?.toExact() === maxInputAmount.toExact()

  const onPress = (): void => {
    if (disableMaxButton) return

    onSetMax(maxInputAmount.toExact())
  }

  const isSwapRewriteFeatureEnabled = useFeatureFlag(FEATURE_FLAGS.SwapRewrite)
  if (isSwapRewriteFeatureEnabled) {
    return (
      <Trace logPress element={ElementName.SetMax}>
        <TouchableArea
          backgroundColor="$accentSoft"
          borderRadius="$rounded8"
          disabled={disableMaxButton}
          paddingHorizontal="$spacing4"
          paddingVertical="$spacing2"
          style={style}
          onPress={onPress}>
          <Text color="$accent1" variant="buttonLabel4">
            {t('Max')}
          </Text>
        </TouchableArea>
      </Trace>
    )
  }

  return (
    <Trace logPress element={ElementName.SetMax}>
      <TouchableArea disabled={disableMaxButton} style={style} onPress={onPress}>
        <Text color={disableMaxButton ? '$neutral3' : '$accent1'} variant="subheading2">
          {t('Max')}
        </Text>
      </TouchableArea>
    </Trace>
  )
}
