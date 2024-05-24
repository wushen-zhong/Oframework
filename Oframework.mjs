const config = {
  eventArgumentName: 'ev',

  defineAttributeName: 'o:define',
  letAttributeName: 'o:let',
  onAttributeName: 'o:on',
  runAttributeName: 'o:run',
  endAttributeName: 'o:end',
  backupAttributeName: 'o:backup',
  injectAttributeName: 'o:inject',
  shadowAttributeName: 'o:shadow'
}

const templateElements = new Map()
let injectList = []
const mutatedWeakSet = new WeakSet()

/**
 * 
 * @param {Element} beginEle
 * @param {String} key
 * @returns {Element|null}
 */
function getHostElement(beginEle, key) {
  for (
    let ele = beginEle;
    ele !== null && ele !== undefined;
    ele = ele.parentElement ?? ele.parentNode?.host
  ) {
    if (Object.hasOwn(ele, key))
      return ele
    if (Object.hasOwn(ele.dataset, key))
      return ele.dataset
  }
  return null
}

/**
 * 
 * @param {Element} ele 
 */
function convertAttributes(ele) {
  for (const { name, value } of ele.attributes)
    if (name.startsWith(config.onAttributeName) && value.startsWith('{'))
      ele.setAttribute(name, `[function (${config.eventArgumentName}) ${value}]`)

  const orunValue = ele.getAttribute(config.runAttributeName)
  if (orunValue?.startsWith('{'))
    ele.setAttribute(config.runAttributeName, `[function () ${orunValue}]`)

  const oendValue = ele.getAttribute(config.endAttributeName)
  if (oendValue?.startsWith('{'))
    ele.setAttribute(config.endAttributeName, `[function () ${oendValue}]`)
}

/**
 * 
 * @param {Element} ele
 * @returns {Element}
 */
function extendElement(ele, $proxy) {
  if (!(ele instanceof Element)) {
    console.error(ele)
    throw new TypeError(`Invalid argument: ${Object.prototype.toString.call(ele)}.`)
  }

  const templateEle = templateElements.get(ele.tagName.toLowerCase())
  if (templateEle === undefined)
    return ele
  const parentEle = templateEle.cloneNode(true)
  parentEle.removeAttribute(config.defineAttributeName)

  for (const { name, value } of ele.attributes) {
    if (parentEle.hasAttribute(name)) {
      const parentValue = parentEle.getAttribute(name)
      if (name == config.letAttributeName || name.startsWith(config.onAttributeName) || name == config.runAttributeName)
        parentEle.setAttribute(name, parentValue.slice(0, -1) + ', ' + value.slice(1))
      else if (name == 'class')
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
 * @param {} value
 */
function defineVariable(ele, key, value) {
  Object.defineProperty(ele, key, {
    get: () => value,
    set: (v) => {
      value = v
      injectList = injectList.filter(([weakEle, _usedKey]) => weakEle.deref() !== undefined)
      injectList
        .map(([weakEle, usedKey]) => [weakEle.deref(), usedKey])
        .filter(([eleHasOinject, usedKey]) => ele.contains(eleHasOinject) && key == usedKey)
        .forEach(([eleHasOinject, usedKey]) => {
          for (
            let hostEle = eleHasOinject;
            hostEle !== null && hostEle !== undefined;
            hostEle = hostEle.parentElement ?? hostEle.parentNode?.host
          ) {
            if (Object.hasOwn(hostEle, usedKey) && ele === hostEle) {
              eleHasOinject.innerHTML = Function('$', `return \`${eleHasOinject.getAttribute(config.injectAttributeName)}\``).call(eleHasOinject, new Proxy({}, {
                get: (_target, p) => getHostElement(eleHasOinject, p)[p],
                set: (_target, p, newValue) => getHostElement(eleHasOinject, p)[p] = newValue
              }))
            }
          }
        })
    }
  })
}

function hideElement(ele) {
  if (ele.hasAttribute('style')) {
    ele.setAttribute('style', ele.getAttribute('style') + '; display: none;')
    return true
  } else {
    ele.setAttribute('style', '; display: none;')
    return false
  }
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
    let obackup
    if (ele.parentElement.hasAttribute(config.backupAttributeName))
      obackup = JSON.parse(ele.parentElement.getAttribute(config.backupAttributeName))
    else
      obackup = []
    const parentEle = ele.parentElement
    const documentFragment = document.createDocumentFragment()
    for (const templateEle of [ele, ...ele.querySelectorAll('*[o\\:template]')]) {
      convertAttributes(templateEle)
      documentFragment.append(templateEle)
    }
    for (const templateEle of documentFragment.children) {
      templateElements.set(templateEle.getAttribute(config.defineAttributeName), templateEle)
      obackup.push(templateEle.outerHTML)
    }
    parentEle.setAttribute(config.backupAttributeName, JSON.stringify(obackup))
    return null
  }

  if (ele.hasAttribute(config.backupAttributeName)) {
    const documentFragment = document.createElement('div')
    documentFragment.innerHTML = JSON.parse(ele.getAttribute(config.backupAttributeName)).join('')
    for (const templateEle of documentFragment.children)
      templateElements.set(templateEle.getAttribute(config.defineAttributeName), templateEle)
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

  if (ele.hasAttribute(config.letAttributeName)) {
    const odefValue = ele.getAttribute(config.letAttributeName)
    checkAttribute(ele, config.letAttributeName, odefValue)
    const defObj = Function('$', `return ${odefValue}`).call(ele, $proxy)
    for (const [key, value] of Object.entries(defObj))
      defineVariable(ele, key, value)
  }

  const onAttributeNameLength = config.onAttributeName.length
  for (const { name, value } of ele.attributes) {
    if (name.startsWith(config.onAttributeName)) {
      checkAttribute(ele, name, value)
      Function('$', `return ${value}`)
        .call(ele, $proxy)
        .reverse()
        .forEach(handle => ele.addEventListener(name.slice(onAttributeNameLength), handle))
    }
  }

  ele.setAttribute('style', ele.getAttribute('style').slice(0, -16))
  if (noStyle)
    ele.removeAttribute('style')

  if (ele.hasAttribute(config.runAttributeName)) {
    const orunValue = ele.getAttribute(config.runAttributeName)
    checkAttribute(ele, config.runAttributeName, orunValue)
    Function('$', `return ${orunValue}`)
      .call(ele, $proxy)
      .reverse()
      .forEach(handle => handle.call(ele))
  }

  if (ele.hasAttribute(config.injectAttributeName)) {
    let oinjectValue = ele.getAttribute(config.injectAttributeName)
    if (oinjectValue == '') {
      oinjectValue = ele.innerHTML
      ele.setAttribute(config.injectAttributeName, oinjectValue)
    }
    Function('$', `return \`${oinjectValue}\``).call(ele, new Proxy({}, {
      get: (_target, p) => injectList.push([new WeakRef(ele), p])
    }))
    ele.innerHTML = Function('$', `return \`${oinjectValue}\``).call(ele, $proxy)
  }

  if (ele.shadowRoot !== null)
    for (const child of [...ele.shadowRoot.children])
      mutate(child)
  for (const child of [...ele.children])
    mutate(child)

  if (ele.hasAttribute(config.endAttributeName)) {
    const oendValue = ele.getAttribute(config.endAttributeName)
    checkAttribute(ele, config.endAttributeName, oendValue)
    Function('$', `return ${oendValue}`)
      .call(ele, $proxy)
      .reverse()
      .forEach(handle => handle.call(ele))
  }

  return ele
}

window.addEventListener('DOMContentLoaded', () => {
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

export default config