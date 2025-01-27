import { createAction } from '@reduxjs/toolkit'
import { parseUri } from '@walletconnect/utils'
import { Alert } from 'react-native'
import { URL } from 'react-native-url-polyfill'
import { appSelect } from 'src/app/hooks'
import { navigate } from 'src/app/navigation/rootNavigation'
import { handleMoonpayReturnLink } from 'src/features/deepLinking/handleMoonpayReturnLinkSaga'
import { handleSwapLink } from 'src/features/deepLinking/handleSwapLinkSaga'
import { handleTransactionLink } from 'src/features/deepLinking/handleTransactionLinkSaga'
import { openModal } from 'src/features/modals/modalSlice'
import { sendMobileAnalyticsEvent } from 'src/features/telemetry'
import { MobileEventName, ModalName, ShareableEntity } from 'src/features/telemetry/constants'
import { waitForWcWeb3WalletIsReady } from 'src/features/walletConnect/saga'
import { pairWithWalletConnectURI } from 'src/features/walletConnect/utils'
import { setDidOpenFromDeepLink } from 'src/features/walletConnect/walletConnectSlice'
import { WidgetType } from 'src/features/widgets/widgets'
import { Screens } from 'src/screens/Screens'
import { openUri, UNISWAP_APP_NATIVE_TOKEN } from 'src/utils/linking'
import { call, put, takeLatest } from 'typed-redux-saga'
import { logger } from 'utilities/src/logger/logger'
import { UNISWAP_APP_HOSTNAME } from 'wallet/src/constants/urls'
import { fromUniswapWebAppLink } from 'wallet/src/features/chains/utils'
import {
  selectAccounts,
  selectActiveAccount,
  selectActiveAccountAddress,
  selectNonPendingAccounts,
} from 'wallet/src/features/wallet/selectors'
import { setAccountAsActive } from 'wallet/src/features/wallet/slice'
import i18n from 'wallet/src/i18n/i18n'
import { buildCurrencyId, buildNativeCurrencyId } from 'wallet/src/utils/currencyId'

export interface DeepLink {
  url: string
  coldStart: boolean
}

export enum LinkSource {
  Widget = 'Widget',
  Share = 'Share',
}

const UNISWAP_URL_SCHEME = 'uniswap://'
const UNISWAP_URL_SCHEME_WALLETCONNECT = 'uniswap://wc?uri='
const UNISWAP_URL_SCHEME_WIDGET = 'uniswap://widget/'

const NFT_ITEM_SHARE_LINK_HASH_REGEX = /^(#\/)?nfts\/asset\/(0x[a-fA-F0-9]{40})\/(\d+)$/
const NFT_COLLECTION_SHARE_LINK_HASH_REGEX = /^(#\/)?nfts\/collection\/(0x[a-fA-F0-9]{40})$/
const TOKEN_SHARE_LINK_HASH_REGEX = RegExp(
  // eslint-disable-next-line no-useless-escape
  `^(#\/)?tokens\/([\\w\\d]*)\/(0x[a-fA-F0-9]{40}|${UNISWAP_APP_NATIVE_TOKEN})$`
)
const ADDRESS_SHARE_LINK_HASH_REGEX = /^(#\/)?address\/(0x[a-fA-F0-9]{40})$/

export const openDeepLink = createAction<DeepLink>('deeplink/open')

export function* deepLinkWatcher() {
  yield* takeLatest(openDeepLink.type, handleDeepLink)
}

export function* handleUniswapAppDeepLink(path: string, url: string, linkSource: LinkSource) {
  // Navigate to the home page to ensure that a page isn't already open as a screen,
  // which causes the bottom sheet to break
  navigate(Screens.Home)

  // Handle NFT Item share (ex. https://app.uniswap.org/#/nfts/asset/0x.../123)
  if (NFT_ITEM_SHARE_LINK_HASH_REGEX.test(path)) {
    const [, , contractAddress, tokenId] = path.match(NFT_ITEM_SHARE_LINK_HASH_REGEX) || []
    if (!contractAddress || !tokenId) return
    yield* put(
      openModal({
        name: ModalName.Explore,
        initialState: {
          screen: Screens.NFTItem,
          params: {
            address: contractAddress,
            tokenId,
            isSpam: false,
          },
        },
      })
    )
    yield* call(sendMobileAnalyticsEvent, MobileEventName.ShareLinkOpened, {
      entity: ShareableEntity.NftItem,
      url,
    })
    return
  }

  // Handle NFT collection share (ex. https://app.uniswap.org/#/nfts/collection/0x...)
  if (NFT_COLLECTION_SHARE_LINK_HASH_REGEX.test(path)) {
    const [, , contractAddress] = path.match(NFT_COLLECTION_SHARE_LINK_HASH_REGEX) || []
    if (!contractAddress) return
    yield* put(
      openModal({
        name: ModalName.Explore,
        initialState: {
          screen: Screens.NFTCollection,
          params: {
            collectionAddress: contractAddress,
          },
        },
      })
    )
    yield* call(sendMobileAnalyticsEvent, MobileEventName.ShareLinkOpened, {
      entity: ShareableEntity.NftCollection,
      url,
    })
    return
  }

  // Handle Token share (ex. https://app.uniswap.org/#/tokens/ethereum/0x...)
  if (TOKEN_SHARE_LINK_HASH_REGEX.test(path)) {
    const [, , network, contractAddress] = path.match(TOKEN_SHARE_LINK_HASH_REGEX) || []
    const chainId = network && fromUniswapWebAppLink(network)
    if (!chainId || !contractAddress) return
    const currencyId =
      contractAddress === UNISWAP_APP_NATIVE_TOKEN
        ? buildNativeCurrencyId(chainId)
        : buildCurrencyId(chainId, contractAddress)
    yield* put(
      openModal({
        name: ModalName.Explore,
        initialState: {
          screen: Screens.TokenDetails,
          params: {
            currencyId,
          },
        },
      })
    )
    if (linkSource === LinkSource.Share) {
      yield* call(sendMobileAnalyticsEvent, MobileEventName.ShareLinkOpened, {
        entity: ShareableEntity.Token,
        url,
      })
    } else {
      yield* call(sendMobileAnalyticsEvent, MobileEventName.WidgetClicked, {
        widget_type: WidgetType.TokenPrice,
        url,
      })
    }
    return
  }

  // Handle Address share (ex. https://app.uniswap.org/#/address/0x...)
  if (ADDRESS_SHARE_LINK_HASH_REGEX.test(path)) {
    const [, , accountAddress] = path.match(ADDRESS_SHARE_LINK_HASH_REGEX) || []
    if (!accountAddress) return
    const accounts = yield* appSelect(selectNonPendingAccounts)
    const activeAccountAddress = yield* appSelect(selectActiveAccountAddress)
    if (accountAddress === activeAccountAddress) return

    const isInternal = Boolean(accounts?.[accountAddress])
    if (isInternal) {
      yield* put(setAccountAsActive(accountAddress))
    } else {
      yield* put(
        openModal({
          name: ModalName.Explore,
          initialState: {
            screen: Screens.ExternalProfile,
            params: {
              address: accountAddress,
            },
          },
        })
      )
    }
    yield* call(sendMobileAnalyticsEvent, MobileEventName.ShareLinkOpened, {
      entity: ShareableEntity.Wallet,
      url,
    })
    return
  }
}

export function* handleDeepLink(action: ReturnType<typeof openDeepLink>) {
  const { coldStart } = action.payload
  try {
    const url = new URL(action.payload.url)

    const activeAccount = yield* appSelect(selectActiveAccount)
    if (!activeAccount) {
      // For app.uniswap.org links it should open a browser with the link
      // instead of handling it inside the app
      if (url.hostname === UNISWAP_APP_HOSTNAME) {
        yield* call(openUri, action.payload.url, /* openExternalBrowser */ true)
      }
      // Skip handling any other deep links
      return
    }

    // Handle WC deep link via URL scheme connections (ex. uniswap://wc?uri=123))
    if (action.payload.url.startsWith(UNISWAP_URL_SCHEME_WALLETCONNECT)) {
      let wcUri = action.payload.url.split(UNISWAP_URL_SCHEME_WALLETCONNECT)[1]
      if (!wcUri) return
      // Decode URI to handle special characters like %3A => :
      wcUri = decodeURIComponent(wcUri)
      yield* call(handleWalletConnectDeepLink, wcUri)
      return
    }

    // Handles deep links from Uniswap Widgets (ex. uniswap://widget/#/tokens/ethereum/0x...)
    if (action.payload.url.startsWith(UNISWAP_URL_SCHEME_WIDGET)) {
      yield* call(handleUniswapAppDeepLink, url.hash, action.payload.url, LinkSource.Widget)
      return
    }

    // Skip handling any non-WalletConnect uniswap:// URL scheme deep links for now for security reasons
    // Currently only used on WalletConnect Universal Link web page fallback button (https://uniswap.org/app/wc)
    if (action.payload.url.startsWith(UNISWAP_URL_SCHEME)) {
      // Set didOpenFromDeepLink so that `returnToPreviousApp()` is enabled during WalletConnect flows
      yield* put(setDidOpenFromDeepLink(true))
      return
    }

    // Handle WC universal links connections (ex. https://uniswap.org/app/wc?uri=123)
    if (url.pathname.includes('/wc')) {
      // Only initial session connections include `uri` param, signing requests only link to /wc
      const wcUri = url.searchParams.get('uri')
      if (!wcUri) return
      yield* call(handleWalletConnectDeepLink, wcUri)
      return
    }

    if (url.hostname === UNISWAP_APP_HOSTNAME) {
      const urlParts = url.href.split(`${UNISWAP_APP_HOSTNAME}/`)
      const urlPath = urlParts.length >= 1 ? (urlParts[1] as string) : ''
      yield* call(handleUniswapAppDeepLink, urlPath, action.payload.url, LinkSource.Share)
      return
    }

    const screen = url.searchParams.get('screen')
    const userAddress = url.searchParams.get('userAddress')
    const fiatOnRamp = url.searchParams.get('fiatOnRamp') === 'true'

    const validUserAddress = yield* call(parseAndValidateUserAddress, userAddress)
    yield* put(setAccountAsActive(validUserAddress))

    switch (screen) {
      case 'transaction':
        if (fiatOnRamp) {
          yield* call(handleMoonpayReturnLink)
        } else {
          yield* call(handleTransactionLink)
        }
        break
      case 'swap':
        yield* call(handleSwapLink, url)
        break
      default:
        throw new Error('Invalid or unsupported screen')
    }

    yield* call(sendMobileAnalyticsEvent, MobileEventName.DeepLinkOpened, {
      url: url.toString(),
      screen,
      is_cold_start: coldStart,
    })
  } catch (error) {
    yield* call(logger.error, error, {
      tags: { file: 'handleDeepLinkSaga', function: 'handleDeepLink' },
    })
  }
}

export function* handleWalletConnectDeepLink(wcUri: string) {
  yield* call(waitForWcWeb3WalletIsReady)

  const wcUriVersion = parseUri(wcUri).version

  if (wcUriVersion === 1) {
    Alert.alert(
      i18n.t('Invalid QR Code'),
      i18n.t(
        'WalletConnect v1 is no longer supported. The application you’re trying to connect to needs to upgrade to WalletConnect v2.'
      ),
      [{ text: i18n.t('OK') }]
    )
    return
  }

  if (wcUriVersion === 2) {
    try {
      yield* call(pairWithWalletConnectURI, wcUri)
    } catch (error) {
      logger.error(error, {
        tags: { file: 'handleDeepLinkSaga', function: 'handleWalletConnectDeepLink' },
      })
      Alert.alert(
        i18n.t('WalletConnect Error'),
        i18n.t('There was an issue with WalletConnect. Please try again')
      )
    }
  }

  // Set didOpenFromDeepLink so that `returnToPreviousApp()` is enabled during WalletConnect flows
  yield* put(setDidOpenFromDeepLink(true))
}

export function* parseAndValidateUserAddress(userAddress: string | null) {
  if (!userAddress) {
    throw new Error('No `userAddress` provided')
  }

  const userAccounts = yield* appSelect(selectAccounts)
  const matchingAccount = Object.values(userAccounts).find(
    (account) => account.address.toLowerCase() === userAddress.toLowerCase()
  )

  if (!matchingAccount) {
    throw new Error('User address supplied in path does not exist in wallet')
  }

  return matchingAccount.address
}
