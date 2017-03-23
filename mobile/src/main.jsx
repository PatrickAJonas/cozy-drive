/* global cozy */

import 'babel-polyfill'

import '../../src/styles/main'

import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { Router, hashHistory } from 'react-router'

import { I18n } from '../../src/lib/I18n'

import MobileAppRoute from './components/MobileAppRoute'

import { loadState } from './lib/localStorage'
import { getStore } from './lib/store'
import { initService } from './lib/init'
import { startBackgroundService, stopBackgroundService } from './lib/background'
import { initBar, isClientRegistered, resetClient, refreshFolder, onError } from './lib/cozy-helper'

const renderAppWithPersistedState = persistedState => {
  const store = getStore(persistedState)
  initService(store)

  function requireSetup (nextState, replace, callback) {
    const client = store.getState().mobile.settings.client
    const isSetup = store.getState().mobile.settings.authorized
    if (isSetup) {
      isClientRegistered(client).then(clientIsRegistered => {
        if (clientIsRegistered) {
          const options = {
            onError: onError(store.dispatch, store.getState),
            onComplete: refreshFolder(store.dispatch, store.getState)
          }
          cozy.client.offline.startRepeatedReplication('io.cozy.files', 15, options)
          initBar()
        } else {
          onError(store.dispatch, store.getState)()
        }
        callback()
      })
    } else {
      resetClient()
      replace({
        pathname: '/onboarding',
        state: { nextPathname: nextState.location.pathname }
      })
      callback()
    }
  }

  document.addEventListener('deviceready', () => {
    if (store.getState().mobile.settings.backupImages) {
      startBackgroundService()
    } else {
      stopBackgroundService()
    }
  }, false)

  const context = window.context
  const root = document.querySelector('[role=application]')
  const lang = (navigator && navigator.language) ? navigator.language.slice(0, 2) : 'en'

  render((
    <I18n context={context} lang={lang}>
      <Provider store={store}>
        <Router history={hashHistory} routes={MobileAppRoute(requireSetup)} />
      </Provider>
    </I18n>
  ), root)
}

document.addEventListener('DOMContentLoaded', () =>
  loadState()
  .then(renderAppWithPersistedState)
)