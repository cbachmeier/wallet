import { useCallback, useState } from 'react'
import {
  LayoutRectangle,
  NativeSyntheticEvent,
  TextInput as NativeTextInput,
  TextInputContentSizeChangeEventData,
} from 'react-native'
import { TextInput } from 'src/components/input/TextInput'
import { IS_ANDROID } from 'src/constants/globals'
import { Flex, useSporeColors } from 'ui/src'
import { spacing } from 'ui/src/theme'

interface Props {
  autoCorrect: boolean
  blurOnSubmit: boolean
  inputAlignment: 'center' | 'flex-start'
  value?: string
  inputFontSize: number
  inputMaxFontSizeMultiplier: number
  inputSuffix?: string
  textAlign?: 'left' | 'right' | 'center'
  textInputRef: React.RefObject<NativeTextInput>
  layout?: LayoutRectangle | null
  onBlur?: () => void
  onFocus?: () => void
  onChangeText?: (text: string) => void
  onSubmitEditing?: () => void
}

export default function InputWithSuffix(props: Props): JSX.Element {
  return IS_ANDROID && props.inputSuffix ? (
    <Flex width="100%">
      <Inputs {...props} layerType="foreground" />
      <Inputs {...props} layerType="background" />
    </Flex>
  ) : (
    <Inputs {...props} />
  )
}

function Inputs({
  value,
  layout,
  inputSuffix,
  inputAlignment,
  inputFontSize,
  inputMaxFontSizeMultiplier,
  textAlign,
  textInputRef,
  layerType,
  ...inputProps
}: Props & { layerType?: 'foreground' | 'background' }): JSX.Element {
  const colors = useSporeColors()
  const [isMultiline, setIsMultiline] = useState(false)

  const handleContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      if (textInputRef.current) {
        setIsMultiline(Math.floor(e.nativeEvent.contentSize.height / inputFontSize) > 1)
      }
    },
    [textInputRef, inputFontSize]
  )

  const isInputEmpty = !value?.length

  const foregroundFallbackTextAlignment =
    isMultiline || inputAlignment === 'flex-start' ? 'left' : 'center'
  const foregroundTextAlignment = textAlign ?? foregroundFallbackTextAlignment

  const fallbackBackgroundTextAlignment = inputAlignment === 'flex-start' ? 'left' : 'center'
  const backgroundTextAlignment = textAlign ?? fallbackBackgroundTextAlignment

  return (
    <Flex
      alignItems="flex-end"
      flexDirection="row"
      justifyContent={inputAlignment}
      width="100%"
      {...(layerType === 'foreground' ? { position: 'absolute', left: 0, bottom: 0 } : {})}
      {...(layerType === 'background' ? { pointerEvents: 'none' } : {})}>
      {layerType === 'foreground' ? (
        <TextInput
          ref={textInputRef}
          backgroundColor="$transparent"
          color="$neutral1"
          fontSize={inputFontSize}
          justifyContent="flex-start"
          lineHeight={inputFontSize}
          maxFontSizeMultiplier={inputMaxFontSizeMultiplier}
          multiline={true}
          px="$none"
          py="$none"
          scrollEnabled={false}
          textAlign={isInputEmpty ? 'left' : foregroundTextAlignment}
          textAlignVertical="bottom"
          value={value}
          width="100%"
          onContentSizeChange={handleContentSizeChange}
          {...inputProps}
        />
      ) : (
        <TextInput
          autoFocus
          autoCapitalize="none"
          backgroundColor="$transparent"
          color="$neutral1"
          fontSize={inputFontSize}
          justifyContent="center"
          lineHeight={inputFontSize}
          maxFontSizeMultiplier={inputMaxFontSizeMultiplier}
          multiline={true}
          px="$none"
          py="$none"
          returnKeyType="done"
          scrollEnabled={false}
          selectionColor={colors.neutral1.get()}
          spellCheck={false}
          testID="import_account_form/input"
          textAlign={backgroundTextAlignment}
          textAlignVertical="bottom"
          value={value}
          width={value ? 'auto' : (layout?.width || 0) + spacing.spacing8}
          {...(layerType === 'background'
            ? { opacity: 0, editable: false }
            : { ...inputProps, ref: textInputRef })}
        />
      )}
      {inputSuffix && value && !value.includes(inputSuffix) ? (
        <TextInput
          backgroundColor="$transparent"
          color="$neutral2"
          editable={false}
          fontSize={inputFontSize}
          justifyContent="center"
          lineHeight={inputFontSize}
          maxFontSizeMultiplier={inputMaxFontSizeMultiplier}
          multiline={true}
          px="$none"
          py="$none"
          scrollEnabled={false}
          textAlignVertical="bottom"
          value={inputSuffix}
          {...(layerType === 'foreground' ? { opacity: 0 } : {})}
        />
      ) : null}
    </Flex>
  )
}
