import { ColorTokens, Flex, Icons, Text } from 'ui/src'
import { fonts, IconSizeTokens } from 'ui/src/theme'
import { formatNumber, formatPercent, NumberType } from 'utilities/src/format/format'

interface RelativeChangeProps {
  change?: number
  absoluteChange?: number
  variant?: keyof typeof fonts
  semanticColor?: boolean // If true, entire % change text will render green or red
  positiveChangeColor?: ColorTokens
  negativeChangeColor?: ColorTokens
  arrowSize?: IconSizeTokens
  loading?: boolean
  alignRight?: boolean
}

export function RelativeChange(props: RelativeChangeProps): JSX.Element {
  const {
    absoluteChange,
    change,
    variant = 'subheading2',
    semanticColor,
    positiveChangeColor = '$statusSuccess',
    negativeChangeColor = '$statusCritical',
    arrowSize = '$icon.16',
    loading = false,
    alignRight = false,
  } = props

  const isPositiveChange = change !== undefined ? change >= 0 : undefined
  const arrowColor = isPositiveChange ? positiveChangeColor : negativeChangeColor

  const formattedChange = formatPercent(change !== undefined ? Math.abs(change) : change)
  const formattedAbsChange = absoluteChange
    ? `${formatNumber(Math.abs(absoluteChange), NumberType.PortfolioBalance)}`
    : ''

  return (
    <Flex
      row
      alignItems="center"
      gap="$spacing2"
      justifyContent={alignRight ? 'flex-end' : 'flex-start'}>
      {change !== undefined && (
        <Icons.Caret color={arrowColor} direction={isPositiveChange ? 'n' : 's'} size={arrowSize} />
      )}
      <Flex>
        <Text
          color={
            semanticColor ? (isPositiveChange ? '$statusSuccess' : '$statusCritical') : '$neutral2'
          }
          loading={loading}
          loadingPlaceholderText="▲ $0.00 (0.00)%"
          variant={variant}>
          {absoluteChange ? `${formattedAbsChange} (${formattedChange})` : formattedChange}
        </Text>
      </Flex>
    </Flex>
  )
}
