class Mutater {
  eventArgumentName
  templateElements = new Map()
  injectList = []
  #$Proxy
  allowMutate = true

  /**
   * 
   * @param {object} param0 
   */
  constructor({ eventArgumentName = 'ev' }) {
    if (eventArgumentName !== undefined) {
      if (!/[$_\w][$_\w\d]*/.test(eventArgumentName))
        throw new Error(`Invalid identifier of 'eventArgumentName': ${eventArgumentName}`)
      this.eventArgumentName = eventArgumentName
    }
  }

  /**
   * 
   * @param {Element} beginEle
   * @param {String} key
   * @returns {Element|null}
   */
  #getHostElement = (beginEle, key) => {
    for (
      let ele = beginEle;
      ele !== null && ele !== undefined;
      ele = ele.parentElement ?? ele.parentNode?.host
    )
      if (Object.hasOwn(ele, key))
        return ele
    return null
  }

  /**
   * 
   * @param {Element} ele 
   */
  #convertAttributes = (ele) => {
    for (const { name, value } of ele.attributes)
      if (name.startsWith('o:on') && value.startsWith('{'))
        ele.setAttribute(name, `[function (${this.eventArgumentName}) ${value}]`)

    const runValue = ele.getAttribute('o:run')
    if (runValue?.startsWith('{'))
      ele.setAttribute('o:run', `[function () ${runValue}]`)
  }

  /**
   * 
   * @param {Element} ele
   * @returns {Element}
   */
  #extendElement = (ele) => {
    if (!(ele instanceof Element)) {
      console.error(ele)
      throw new TypeError(`Invalid argument: ${Object.prototype.toString.call(ele)}.`)
    }

    const templateEle = this.templateElements.get(ele.tagName.toLowerCase())
    if (templateEle === undefined)
      return ele
    const parentEle = templateEle.cloneNode(true)
    parentEle.removeAttribute('o:template')

    for (const { name, value } of ele.attributes) {
      if (parentEle.hasAttribute(name)) {
        const parentValue = parentEle.getAttribute(name)
        if (name == 'o:def' || name.startsWith('o:on') || name == 'o:run')
          parentEle.setAttribute(name, parentValue.slice(0, -1) + ', ' + value.slice(1))
        else if (name == 'class')
          parentEle.setAttribute(name, parentValue + ' ' + value)
        else
          parentEle.setAttribute(name, parentValue + value)
      } else {
        parentEle.setAttribute(name, value)
      }
    }

    if (parentEle.hasAttribute('o:shadow')) {
      const shadowOptions = Function('return ' + parentEle.getAttribute('o:shadow')).call(ele, this.#$Proxy)
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

    return this.#extendElement(parentEle)
  }

  #checkAttribute = (ele, name, value) => {
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
  #defineVariable = (ele, key, value) => {
    Object.defineProperty(ele, key, {
      get: () => value,
      set: (v) => {
        value = v
        this.injectList = this.injectList.filter(([prop, weakText, injectCode, $Proxy]) => {
          const text = weakText.deref()
          if (text === undefined)
            return false
          if (ele.contains(text) && key == prop) {
            const hostEle = this.#getHostElement(text, prop)
            if (ele === hostEle)
              text.nodeValue = Function('$', `return \`${injectCode}\``).call(text, $Proxy)
          }
          return true
        })
      }
    })
  }

  /**
   * 
   * @param {Element} ele
   * @returns {Element|null}
   */
  #mutateElement = (ele) => {
    if (!(ele instanceof Element)) {
      console.error(ele)
      throw new TypeError(`Invalid argument: ${Object.prototype.toString.call(ele)}.`)
    }

    if (ele.mutated)
      return ele

    if (ele.tagName == 'SCRIPT')
      return ele

    this.#convertAttributes(ele)

    if (ele.hasAttribute('o:template')) {
      for (const templateEle of [ele, ...ele.querySelectorAll('*[o\\:template]')]) {
        this.templateElements.set(templateEle.getAttribute('o:template'), templateEle)
        templateEle.remove()
      }
      return null
    }

    ele.mutated = true

    if (ele.hasAttribute('style')) {
      ele.setAttribute('style', ele.getAttribute('style') + '; display: none;')
    } else {
      var noStyle = true
      ele.setAttribute('style', '; display: none;')
    }

    const extendedEle = this.#extendElement(ele)
    if (extendedEle !== ele) {
      extendedEle.mutated = true
      ele.replaceWith(extendedEle)
      ele = extendedEle
    }

    this.#$Proxy = new Proxy({}, {
      get: (_target, p) => this.#getHostElement(ele, p)[p],
      set: (_target, p, newValue) => this.#getHostElement(ele, p)[p] = newValue
    })

    if (ele.hasAttribute('o:def')) {
      const odefAttrValue = ele.getAttribute('o:def')

      this.#checkAttribute(ele, 'o:def', odefAttrValue)

      const defObj = Function('$', `return ${odefAttrValue}`).call(ele, this.#$Proxy)
      for (let [key, value] of Object.entries(defObj))
        this.#defineVariable(ele, key, value)
    }

    for (const { name, value } of ele.attributes) {
      if (name.startsWith('o:on')) {
        this.#checkAttribute(ele, name, value)

        Function('$', `return ${value}`).call(ele, this.#$Proxy)
          .reverse()
          .forEach(handle => ele.addEventListener(name.slice(4), handle))
      }
    }

    ele.setAttribute('style', ele.getAttribute('style').slice(0, -16))
    if (noStyle)
      ele.removeAttribute('style')

    if (ele.hasAttribute('o:run')) {
      const orunAttrValue = ele.getAttribute('o:run')

      this.#checkAttribute(ele, 'o:run', orunAttrValue)

      Function('$', `return ${orunAttrValue}`).call(ele, this.#$Proxy)
        .reverse()
        .forEach(handle => handle.call(ele))
    }

    return ele
  }

  /**
   * 
   * @param {Text} text
   * @returns {Text}
   */
  #mutateText = (text) => {
    if (!(text instanceof Text)) {
      console.error(text)
      throw new TypeError(`Invalid argument: ${Object.prototype.toString.call(text)}.`)
    }

    if (text.mutated)
      return text

    text.mutated = true

    Function('$', `return \`${text.nodeValue}\``).call(text, new Proxy({}, {
      get: (_target, p) => this.injectList.push([p, new WeakRef(text), text.nodeValue, this.#$Proxy])
    }))

    text.nodeValue = Function('$', `return \`${text.nodeValue}\``).call(text, this.#$Proxy)

    return text
  }

  /**
   * 
   * @param {Node} node
   * @returns {Node|null}
   */
  #mutateNode = (node) => {
    if (!node instanceof Node) {
      console.error(node)
      throw new TypeError(`Invalid argument: ${Object.prototype.toString.call(node)}.`)
    }

    if (node.mutated)
      return node

    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        return this.#mutateElement(node)
      case Node.TEXT_NODE:
        return this.#mutateText(node)
      default:
        return node
    }
  }

  /**
   * 
   * @param {Node} node 
   * @returns 
   */
  #mutateAll = (node) => {
    if (!node instanceof Node) {
      console.error(node)
      throw new TypeError(`Invalid argument: ${Object.prototype.toString.call(node)}.`)
    }

    node = this.#mutateNode(node)

    node?.shadowRoot?.childNodes?.forEach(this.#mutateAll)
    node?.childNodes?.forEach(this.#mutateAll)

    return node
  }

  /**
   * 
   * @param {Node} node 
   * @returns 
   */
  mutate = (node) => {
    if (!node instanceof Node) {
      console.error(node)
      throw new TypeError(`Invalid argument: ${Object.prototype.toString.call(node)}.`)
    }

    if (!this.allowMutate)
      throw new Error(`This function is allowed to be called only once.`)
    this.allowMutate = false

    node = this.#mutateAll(node)

    new MutationObserver(mutationRecords => {
      mutationRecords.forEach(mutationRecord => {
        if (mutationRecord.type == 'childList')
          mutationRecord.addedNodes.forEach(addedNode => this.#mutateAll(addedNode))
      })
    }).observe(node, { childList: true, subtree: true })

    return node
  }
}

export default Mutater