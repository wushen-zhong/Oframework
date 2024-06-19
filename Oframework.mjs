const config = {
  eventArgumentName: 'event',
  defaultPrefix: 'o:',
  defineAttributeName: 'o:define',
  letAttributeName: 'o:let',
  dataAttributeName: 'o:data',
  onAttributePrefix: 'o:on',
  initAttributeName: 'o:init',
  runAttributeName: 'o:run',
  backupAttributeName: 'o:backup',
  injectAttributeName: 'o:inject',
  shadowAttributeName: 'o:shadow'
}

const templateElements = new Proxy({}, {
  get: (target, p) => target[p],
  set: (target, p, newValue) => {
    target[p] = newValue
    let isInitial = true
    document.body.setAttribute(config.backupAttributeName, JSON.stringify(target, (_key, value) => {
      if (isInitial) {
        isInitial = false
        return value
      }
      return value.outerHTML
    }))
    return true
  }
})
let injectList = []
const mutatedWeakSet = new WeakSet()

/**
 * 
 * @param {Element} beginEle
 * @param {String} key
 * @returns {Element|null}
 */
function getHostElement(beginEle, key) {
  for (let ele = beginEle; ele !== null; ele = ele.parentElement)
    if (Object.hasOwn(ele, key))
      return ele
  return null
}

/**
 * 
 * @param {Element} ele 
 */
function convertAttributes(ele) {
  for (const { name, value } of ele.attributes)
    if (name.startsWith(config.onAttributePrefix) && value.startsWith('{'))
      ele.setAttribute(name, `[function (${config.eventArgumentName}) ${value}]`)

  const oinitValue = ele.getAttribute(config.initAttributeName)
  if (oinitValue?.startsWith('{'))
    ele.setAttribute(config.initAttributeName, `[function () ${oinitValue}]`)

  const orunValue = ele.getAttribute(config.runAttributeName)
  if (orunValue?.startsWith('{'))
    ele.setAttribute(config.runAttributeName, `[function () ${orunValue}]`)
}

/**
 * 
 * @param {Element} ele
 * @returns {Element}
 */
function extendElement(ele, $proxy) {
  const templateEle = templateElements[ele.tagName.toLowerCase()]
  if (templateEle === undefined)
    return ele
  const parentEle = templateEle.cloneNode(true)
  parentEle.removeAttribute(config.defineAttributeName)

  for (let { name, value } of ele.attributes) {
    let parentValue
    if (name.startsWith(config.defaultPrefix)) {
      if (parentEle.hasAttribute(name)) {
        parentValue = parentEle.getAttribute(name)
      } else {
        const noPrefixName = name.slice(config.defaultPrefix.length)
        if (parentEle.hasAttribute(noPrefixName)) {
          parentValue = parentEle.getAttribute(noPrefixName)
          parentEle.removeAttribute(noPrefixName)
        }
      }
    } else {
      const prefixName = config.defaultPrefix + name
      if (parentEle.hasAttribute(prefixName)) {
        name = prefixName
        parentValue = parentEle.getAttribute(prefixName)
      } else if (parentEle.hasAttribute(name)) {
        parentValue = parentEle.getAttribute(name)
      }
    }
    if (parentValue !== undefined) {
      if (name == config.dataAttributeName || name == config.letAttributeName || name.startsWith(config.onAttributePrefix)
        || name == config.initAttributeName || name == config.runAttributeName)
        parentEle.setAttribute(name, parentValue.slice(0, -1) + ', ' + value.slice(1))
      else if (name == 'class' || name == config.defaultPrefix + 'class')
        parentEle.setAttribute(name, parentValue + ' ' + value)
      else
        parentEle.setAttribute(name, parentValue + value)
    } else {
      parentEle.setAttribute(name, value)
    }
  }

  if (parentEle.hasAttribute(config.shadowAttributeName)) {
    const shadowOptions = Function('return ' + parentEle.getAttribute(config.shadowAttributeName)).call(ele, $proxy)
    const shadowRoot = parentEle.attachShadow(shadowOptions)
    shadowRoot.append(...parentEle.childNodes)
    parentEle.append(...ele.childNodes)
  } else {
    for (const slotEle of parentEle.querySelectorAll('slot[name]')) {
      const elesHasSlot = ele.querySelectorAll(`*[slot="${slotEle.name}"]`)
      elesHasSlot.forEach(eleHasSlot => eleHasSlot.removeAttribute('slot'))
      slotEle.replaceWith(...elesHasSlot)
    }
    const defaultSlotEle = parentEle.querySelector('slot:not([name])')
    if (defaultSlotEle)
      defaultSlotEle.replaceWith(...ele.childNodes)
    else
      parentEle.append(...ele.childNodes)
  }

  return extendElement(parentEle, $proxy)
}

/**
 * 
 * @param {Element} ele
 * @param {string} name
 * @param {string} value
 */
function checkAttribute(ele, name, value) {
  if (!(
    (value.startsWith('{') && value.endsWith('}'))
    || (value.startsWith('[') && value.endsWith(']'))
  )) {
    console.error(ele)
    throw new SyntaxError(`Invalid attribute value of ${name}: '${value}'.`)
  }
}

/**
 * 
 * @param {Element} ele
 * @param {string} key
 */
function updateInject(ele, key) {
  injectList = injectList.filter(([weakEle]) => weakEle.deref() !== undefined)
  injectList
    .map(([weakEle, usedKey, handle]) => [weakEle.deref(), usedKey, handle])
    .filter(([, usedKey]) => key == usedKey)
    .filter(([eleNeedInject, usedKey]) => ele === getHostElement(eleNeedInject, usedKey))
    .forEach(([eleNeedInject, , handle]) => {
      handle(eleNeedInject, new Proxy({}, {
        get: (_target, p) => getHostElement(eleNeedInject, p)[p],
        set: (_target, p, newValue) => getHostElement(eleNeedInject, p)[p] = newValue
      }))
    })
}

/**
 * 
 * @param {Element} ele
 */
function mutate(ele) {
  if (mutatedWeakSet.has(ele))
    return ele

  if (ele.tagName == 'SCRIPT')
    return null

  if (ele.hasAttribute(config.defineAttributeName)) {
    [ele, ...ele.querySelectorAll(`*[${config.defineAttributeName.replaceAll(':', '\\:')}]`)].forEach(templateEle => {
      templateEle.remove()
      convertAttributes(templateEle)
      templateElements[templateEle.getAttribute(config.defineAttributeName)] = templateEle
    })
    return null
  }

  if (ele.hasAttribute('style')) {
    ele.setAttribute('style', ele.getAttribute('style') + '; display: none;')
    var noStyle = false
  } else {
    ele.setAttribute('style', '; display: none;')
    var noStyle = true
  }

  convertAttributes(ele)

  mutatedWeakSet.add(ele)

  const $proxy = new Proxy({}, {
    get: (_target, p) => getHostElement(ele, p)[p],
    set: (_target, p, newValue) => getHostElement(ele, p)[p] = newValue
  })

  const extendedEle = extendElement(ele, $proxy)
  if (extendedEle !== ele) {
    mutatedWeakSet.add(extendedEle)
    ele.replaceWith(extendedEle)
    ele = extendedEle
  }

  if (ele.hasAttribute(config.dataAttributeName)) {
    let odataValue = ele.getAttribute(config.dataAttributeName)
    checkAttribute(ele, config.dataAttributeName, odataValue)
    odataValue = Function('$', `return ${odataValue}`).call(ele, $proxy)
    ele.setAttribute(config.dataAttributeName, JSON.stringify(odataValue))
    for (const key in odataValue) {
      Object.defineProperty(ele, key, {
        get: () => odataValue[key],
        set: (v) => {
          odataValue[key] = v
          ele.setAttribute(config.dataAttributeName, JSON.stringify(odataValue))
          updateInject(ele, key)
        }
      })
    }
  }

  if (ele.hasAttribute(config.letAttributeName)) {
    const odefValue = ele.getAttribute(config.letAttributeName)
    checkAttribute(ele, config.letAttributeName, odefValue)
    for (let [key, value] of Object.entries(Function('$', `return ${odefValue}`).call(ele, $proxy))) {
      Object.defineProperty(ele, key, {
        get: () => value,
        set: (v) => {
          value = v
          updateInject(ele, key)
        }
      })
    }
  }

  for (const { name, value } of ele.attributes) {
    if (name.startsWith(config.onAttributePrefix)) {
      checkAttribute(ele, name, value)
      Function('$', `return ${value}`)
        .call(ele, $proxy)
        .forEach(handle => ele.addEventListener(name.slice(config.onAttributePrefix.length), handle))
    }
  }

  [...ele.attributes]
    .filter(({ name }) => ![
      config.defineAttributeName, config.letAttributeName, config.initAttributeName, config.runAttributeName,
      config.backupAttributeName, config.injectAttributeName, config.shadowAttributeName, config.dataAttributeName
    ].includes(name))
    .filter(({ name }) => !name.startsWith(config.onAttributePrefix))
    .filter(({ name }) => name.startsWith(config.defaultPrefix))
    .forEach(({ name, value }) => {
      const handle = (ele_, $proxy_) => ele_.setAttribute(name.slice(config.defaultPrefix.length), Function('$', `return \`${value}\``).call(ele_, $proxy_))
      Function('$', `return \`${value}\``).call(ele, new Proxy({}, {
        get: (_target, p) => {
          injectList.push([new WeakRef(ele), p, handle])
          return getHostElement(ele, p)[p]
        },
        set: () => { throw new SyntaxError(`Invalid attribute value of ${name}: '${value}'.`) }
      }))
      handle(ele, $proxy)
    })

  ele.setAttribute('style', ele.getAttribute('style').slice(0, -16))
  if (noStyle)
    ele.removeAttribute('style')

  if (ele.hasAttribute(config.initAttributeName)) {
    const oinitValue = ele.getAttribute(config.initAttributeName)
    checkAttribute(ele, config.initAttributeName, oinitValue)
    Function('$', `return ${oinitValue}`)
      .call(ele, $proxy)
      .forEach(handle => handle.call(ele))
    ele.removeAttribute(config.initAttributeName)
  }

  if (ele.hasAttribute(config.injectAttributeName)) {
    let oinjectValue = ele.getAttribute(config.injectAttributeName)
    if (oinjectValue == '') {
      oinjectValue = ele.innerHTML
      ele.setAttribute(config.injectAttributeName, oinjectValue)
    }
    const handle = (ele_, $proxy_) => ele_.innerHTML = Function('$', `return \`${oinjectValue}\``).call(ele_, $proxy_)
    Function('$', `return \`${oinjectValue}\``).call(ele, new Proxy({}, {
      get: (_target, p) => {
        injectList.push([new WeakRef(ele), p, handle])
        return getHostElement(ele, p)[p]
      },
      set: () => { throw new SyntaxError(`Invalid attribute value of ${config.injectAttributeName}: '${oinjectValue}'.`) }
    }))
    handle(ele, $proxy)
  }

  if (ele.shadowRoot !== null)
    for (const child of [...ele.shadowRoot.children])
      mutate(child)
  for (const child of [...ele.children])
    mutate(child)

  if (ele.hasAttribute(config.runAttributeName)) {
    const orunValue = ele.getAttribute(config.runAttributeName)
    checkAttribute(ele, config.runAttributeName, orunValue)
    Function('$', `return ${orunValue}`)
      .call(ele, $proxy)
      .forEach(handle => handle.call(ele))
  }

  return ele
}

window.addEventListener('DOMContentLoaded', () => {
  if (document.body.hasAttribute(config.backupAttributeName)) {
    const div = document.createElement('div')
    Object.assign(
      templateElements,
      JSON.parse(
        document.body.getAttribute(config.backupAttributeName),
        (_key, value) => {
          if (typeof value == "object")
            return value
          div.innerHTML = value
          return div.children[0]
        }
      )
    )
  }

  new MutationObserver(mutationRecords => {
    mutationRecords.forEach(mutationRecord => {
      mutationRecord.addedNodes.forEach(addedNode => {
        if (addedNode.nodeType === Node.ELEMENT_NODE)
          mutate(addedNode)
      })
    })
  }).observe(document.body, { childList: true, subtree: true })

  mutate(document.body)
})

export { config, templateElements }