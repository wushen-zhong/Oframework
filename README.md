# Oframework

Just a simple HTML / JavaScript framework. 一个简单的 HTML/JavaScript 前端框架。

## 示例

### [EasyDesigner.html](./EasyDesigner.html)

简单的网页设计程序，使用 TaiwindCSS

## 文档

全局引入 Oframework ，并通过`config`对象修改属性名默认值

```html
<script src="./Oframework.mjs" type="module"></script>
<script type="module">
  import config from './Oframework.mjs'
  config.defineAttributeName = 'o:template'
  config.letAttributeName = 'o:var'
</script>
```

### 标签属性

#### `o:let`

在元素上定义变量

```html
<div o:let="{ num: 1 }"></div>
```

所有以`o:`开头的属性的值中都可以使用`$`对象来获取父元素链上定义的变量，不会跨越`shadowRoot`

```html
<div o:let="{ num: 1 }">
  <div o:let="{ fn: function () { return $.num } }"></div>
</div>
```

#### `o:data`

在元素上定义变量，顺序在`o:let`之前，且每次更改都会以JSON语法保存新值到`o:data`属性上

```html
<div o:data="{ num: 1 }" o:init="$.num = 2"></div>
```

转化为

```html
<div o:data="{ &quot;num&quot;: 1 }"></div>
```

#### `o:on` + 事件名

在元素上定义事件监听器

```html
<div o:onclick="{ console.log(1) }"></div>
```

> [!NOTE]
> `o:data`、`o:let`属性值以及以`{}`定义`o:on`、`o:init`、`o:run`属性值中不应含有前导或尾随空字符

在相同的事件上定义多个监听器，将按顺序添加

```html
<div o:onclick="[function (event) { console.log(1) }, function (event) { console.log(2) }]"></div>
```

不推荐主动使用这种方法，尽量通过继承自动实现

#### `o:init`，`o:run`

`o:init`定义初始化的代码块，将在转化时立即执行，此时子元素尚未转化，执行后会删除改属性
`o:run`定义最终运行的代码块，将在所有子元素转化完成后执行

```html
<div o:init="{ console.log(1) }"></div>
<div o:run="{ console.log(1) }"></div>
```

也可定义函数列，将按顺序执行

```html
<div o:init="[function () { console.log(1) }, function () { console.log(2) }]"></div>
<div o:run="[function () { console.log(1) }, function () { console.log(2) }]"></div>
```

不推荐主动使用这种方法，尽量通过继承自动实现

#### `o:define`

定义一个模板标签，转化后将从文档中移除

```html
<div o:define="bob"></div>
```

然后可以像这样来实例化继承模板标签

```html
<bob></bob>
```

也可实现标签的继承链

```html
<bob o:define="john"></bob>
<john></join>
```

继承时模板标签上的所有属性都将转移合并到实例化的标签上，模板元素的属性值在前，实例化标签的属性值在后，对于该模块定义的新属性，将自动转化为可识别的属性值

如定义：

```html
<div o:define="bob" class="monica" o:onclick="{ console.log(2) }"></div>
<bob o:define="john" class="van"></bob>
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
<div o:define="bob" o:shadow="{ mode: 'open' }">
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
<div o:define="bob" class="van">
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

#### `o:backup`

所有`o:define`定义的新标签将会以字符串数组的形式储存在`body`标签`o:backup`属性中，并从文档中移除

最开始转化时会先解析`body`元素的`o:backup`属性值并定义新标签。

#### `o:inject`

定义将要注入（赋值到`innerHTML`）的 HTML 文本，将使用 JavaScript 中的` `` `处理，意味着文本中可以使用`${}`语法，在其中使用`$`对象读取变量时将会保存一个引用，每当对应变量被赋值，使用该变量的文本会被重新计算并注入

若为空值，将先把`innerHTML`的值赋值为`o:inject`的属性值

```html
<div o:let="{ num: 1 }" inject>
  ${$.num}
</div>
```

等价于

```html
<div o:let="{ num: 1 }" inject="\n  ${$.num}\n"></div>
```

### JavaScript API

### `config`

#### `config.eventArgumentName` \<string>

`o:on`定义的事件监听器方法事件对象参数名，默认值：`event`

#### `config.defineAttributeName` \<string>

定义新标签的属性名，默认值：`o:define`

#### `config.letAttributeName` \<string>

定义变量的属性名，默认值：`o:let`

#### `config.dataAttributeName` \<string>

定义存档变量的属性名，默认值：`o:data`

#### `config.onAttributeName` \<string>

定义事件监听器的属性名的开头，默认值：`o:on`

#### `config.initAttributeName` \<string>

定义立刻执行方法的属性名，默认值：`o:init`

#### `config.runAttributeName` \<string>

定义最终执行方法的属性名，默认值：`o:run`

#### `config.backupAttributeName` \<string>

储存模板标签数组的属性名，默认值：`o:backup`

#### `config.injectAttributeName` \<string>

定义注入富文本的属性名，默认值：`o:inject`

#### `config.shadowAttributeName` \<string>

定义`attachShadow`的参数的属性名，默认值：`o:shadow`

### `templateElements`

储存模板元素，对象属性名为模板元素所对应的标签名。通过代码引入模板元素：

```html
<script type="module">
  import templateElements from './Oframework.mjs'
  templateElements['newTag'] = document.createElement('div')
</script>
```
