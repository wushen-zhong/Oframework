# Oframework

Just a simple HTML / JavaScript framework. 一个简单的HTML/JavaScript框架。

## 示例

### [EasyDesigner.html](./EasyDesigner.html)

简单的网页设计程序，使用TaiwindCSS

## 文档

### 标签属性

#### `o:def`

在`div`对象上定义num变量

```html
<div o:def="{ num: 1 }"></div>
```

`o:def`、`o:on`、`o:run`、`o:shadow`属性值中都可以使用`$`对象来获取父元素链上定义的变量

```html
<div o:def="{ num: 1 }">
  <div o:def="{ fn: function () { return $.num } }"></div>
</div>
```

#### `o:on`

在`div`对象上定义事件监听器

```html
<div o:onclick="{ console.log(1) }"></div>
```

> [!NOTE]
> 如此定义的`o:def`、`o:on`、`o:run`属性值中不应含有前导或尾随空字符

在相同的事件上定义多个监听器

```html
<div o:onclick="[function () { console.log(1) }, function () { console.log(2) }]"></div>
```

将按逆序添加，但并不推荐主动使用这种方法，尽量通过继承自动实现

#### `o:run`

定义直接运行的代码块， 将在转化完成后立即执行

```html
<div o:run="{ console.log(1) }"></div>
```

> [!NOTE]
> 此时子元素尚未转化

也可定义函数列，将按逆序执行

```html
<div o:run="[function () { console.log(2) }, function () { console.log(1) }]"></div>
```

并不推荐主动使用这种方法，尽量通过继承自动实现

#### `o:template`

定义一个模板标签，它将保存到`oxygen.templateElements`并从文档中移除

```html
<div o:template="bob"></div>
```

然后可以像这样来继承模板标签

```html
<bob></bob>
```

也可实现标签的继承链

```html
<bob o:template="john"></bob>
<john></join>
```

继承时模板标签上的所有属性都将转移合并到实例化的标签上，模板元素的属性值在前，实例化标签的属性值在后，对于该模块定义的新属性，将自动转化为可识别的样式

如定义：

```html
<div o:template="bob" class="monica" o:onclick="{ console.log(2) }"></div>
<bob o:template="john" class="van"></bob>
```

```html
<john o:onclick="{ console.log(1) }"></join>
```

将转化成

```html
<div class="monica van" o:onclick="[function (event) { console.log(2) }, function (event) { console.log(1) }]"></div>
```

> [!NOTE]
> 只有合并`class`属性时会以空格分隔

#### `o:shadow`

对于模板标签的实例化方法，如果存在`o:shadow`属性，则其值将作为`attachShadow`的参数，其中`clonable`的默认值为`true`，模板标签内所有节点都将附加到模板标签的`ShadowRoot`中

```html
<div o:template="bob" o:shadow="{ mode: 'open' }">
  <div class="van"><slot></slot></div>
</div>
```

```html
<bob>
  <div class="monica"></div>
</bob>
```

将转化为

```html
<bob>
  #shadow-root (open)
    <div class="van"><slot>[assign:div.moinica]</slot></div>
  <div class="monica"></div>
</bob>
```

否则，对于实例化标签内的元素，若含有`slot`属性，则会将模板标签内具有与其值相同的`name`属性的`slot`元素替换为这些元素

若模板标签中有不具`name`属性的`slot`元素，则将其替换实例化标签内的剩余节点，否则将剩余节点直接添加到父元素尾部

```html
<div o:template="bob" class="van">
  <slot name="new"></slot>
  <slot></slot>
</div>
```

```html
<bob>
  <div slot="new"></div>
  <div class="monica"></div>
</bob>
```

将转化成

```html
<div class="van">
  <div></div>
  <div class="monica"></div>
</div>
```

### 标签文本

所有文本将使用` `` `处理，意味着文本中可以使用`${}`语法，在其中使用`$`对象读取变量时将会保存一个引用，每当对应变量被赋值，使用该变量的文本会被重新计算

```html
<div o:def="{ num: 1 }">
  ${$.num}
</div>
```

<!-- ## 方法 -->

### JavaScript API

### `Oxygen`

#### `new Oxygen(options)`

- `options` \<Object>
  - `eventArgumentName` \<string>

#### `oxygen.eventArgumentName` \<string>

定义事件监听器时事件对象的名称。默认值：`'ev'`

#### `oxygen.templateElements` \<Map>

可以手动添加模板元素。键为新标签名，值为模板元素

#### `oxygen.mutateAll(node)`

- `node` \<Node>
- Returns: \<Node> | null

转化节点及其后代节点，如下例，同时可以添加`MutationObserver`来监听元素的实时更改

```js
const oxygen = new Oxygen()
const root = oxygen.mutateAll(document.querySelector('#root'))

new MutationObserver(mutationRecords => {
  mutationRecords.forEach(mutationRecord => {
    mutationRecord.addedNodes.forEach(addedNode => oxygen.mutateAll(addedNode))
  })
}).observe(root, { childList: true, subtree: true })
```

主方法，转化节点及其后代节点，同时添加`MutationObserver`来监听元素的实时更改，该方法只能调用一次，如下例

```js
import Mutater from './Oframework.mjs'
const mutater = new Mutater()
const root = mutater.mutateAll(document.querySelector('#root'))
```
