import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { LongText } from 'src/components/text/LongText'
import { Flex, Text, useSporeColors } from 'ui/src'
import StatsIcon from 'ui/src/assets/icons/chart-bar.svg'
import { iconSizes } from 'ui/src/theme'
import { formatNumber, NumberType } from 'utilities/src/format/format'
import { TokenDetailsScreenQuery } from 'wallet/src/data/__generated__/types-and-hooks'

function StatsRow({
  label,
  children,
  tokenColor,
}: {
  label: string
  children: JSX.Element
  tokenColor?: Nullable<string>
}): JSX.Element {
  const colors = useSporeColors()
  return (
    <Flex row justifyContent="space-between" pl="$spacing2">
      <Flex row alignItems="center" gap="$spacing8" justifyContent="flex-start">
        <StatsIcon
          color={tokenColor ?? colors.neutral3.get()}
          height={iconSizes.icon12}
          width={iconSizes.icon12}
        />
        <Text color="$neutral1" variant="body2">
          {label}
        </Text>
      </Flex>
      {children}
    </Flex>
  )
}

export function TokenDetailsMarketData({
  marketCap,
  volume,
  priceLow52W,
  priceHight52W,
  isLoading = false,
  tokenColor,
}: {
  marketCap?: number
  volume?: number
  priceLow52W?: number
  priceHight52W?: number
  isLoading?: boolean
  tokenColor?: Nullable<string>
}): JSX.Element {
  const { t } = useTranslation()

  // Utility component to render formatted values
  const FormattedValue = useCallback(
    ({ value, numberType }: { value?: number; numberType: NumberType }) => {
      return (
        <Text loading={isLoading} variant="body2">
          {formatNumber(value, numberType)}
        </Text>
      )
    },
    [isLoading]
  )

  return (
    <Flex gap="$spacing8">
      <StatsRow label={t('24h Uniswap volume')} tokenColor={tokenColor}>
        <FormattedValue numberType={NumberType.FiatTokenStats} value={volume} />
      </StatsRow>
      <StatsRow label={t('Market cap')} tokenColor={tokenColor}>
        <FormattedValue numberType={NumberType.FiatTokenStats} value={marketCap} />
      </StatsRow>
      <StatsRow label={t('52W high')} tokenColor={tokenColor}>
        <FormattedValue numberType={NumberType.FiatTokenDetails} value={priceHight52W} />
      </StatsRow>
      <StatsRow label={t('52W low')} tokenColor={tokenColor}>
        <FormattedValue numberType={NumberType.FiatTokenDetails} value={priceLow52W} />
      </StatsRow>
    </Flex>
  )
}

export function TokenDetailsStats({
  data,
  tokenColor,
}: {
  data: TokenDetailsScreenQuery | undefined
  tokenColor?: Maybe<string>
}): JSX.Element {
  const { t } = useTranslation()
  const colors = useSporeColors()

  const onChainData = data?.token
  const offChainData = data?.token?.project

  const description = offChainData?.description
  const name = offChainData?.name ?? onChainData?.name
  const marketCap = offChainData?.markets?.[0]?.marketCap?.value
  const volume = onChainData?.market?.volume?.value
  const priceHight52W =
    offChainData?.markets?.[0]?.priceHigh52W?.value ?? onChainData?.market?.priceHigh52W?.value
  const priceLow52W =
    offChainData?.markets?.[0]?.priceLow52W?.value ?? onChainData?.market?.priceLow52W?.value

  return (
    <Flex gap="$spacing24">
      {description && (
        <Flex gap="$spacing4">
          {name && (
            <Text color="$neutral2" variant="subheading2">
              {t('About {{ token }}', { token: name })}
            </Text>
          )}
          <Flex gap="$spacing16">
            <LongText
              gap="$spacing2"
              initialDisplayedLines={5}
              linkColor={tokenColor ?? colors.neutral1.get()}
              readMoreOrLessColor={tokenColor ?? colors.neutral2.get()}
              text={description.trim()}
            />
          </Flex>
        </Flex>
      )}
      <Flex gap="$spacing4">
        <Text color="$neutral2" variant="subheading2">
          {t('Stats')}
        </Text>
        <TokenDetailsMarketData
          marketCap={marketCap}
          priceHight52W={priceHight52W}
          priceLow52W={priceLow52W}
          tokenColor={tokenColor}
          volume={volume}
        />
      </Flex>
    </Flex>
  )
}
