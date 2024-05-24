# Oframework

Just a simple HTML / JavaScript framework. 一个简单的 HTML/JavaScript 框架。

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
  config.letAttributeName = 'o:define'
</script>
```

### 标签属性

#### `o:let`

在`div`对象上定义num变量

```html
<div o:let="{ num: 1 }"></div>
```

`o:let`、`o:on`、`o:run`、`o:end`、`o:shadow`属性值中都可以使用`$`对象来获取父元素链上定义的变量

```html
<div o:let="{ num: 1 }">
  <div o:let="{ fn: function () { return $.num } }"></div>
</div>
```

#### `o:on`

在`div`对象上定义事件监听器

```html
<div o:onclick="{ console.log(1) }"></div>
```

> [!NOTE]
> 如此定义的`o:let`、`o:on`、`o:run`、`o:end`属性值中不应含有前导或尾随空字符

在相同的事件上定义多个监听器，将按逆序添加

```html
<div o:onclick="[function () { console.log(1) }, function () { console.log(2) }]"></div>
```

并不推荐主动使用这种方法，尽量通过继承自动实现

#### `o:run`，`o:end`

`o:run`定义直接运行的代码块，将在转化完成后立即执行，此时子元素尚未转化
`o:end`定义最终运行的代码块，将在所有子元素转化完成后执行

```html
<div o:run="{ console.log(1) }"></div>
<div o:end="{ console.log(1) }"></div>
```

也可定义函数列，将按逆序执行

```html
<div o:run="[function () { console.log(2) }, function () { console.log(1) }]"></div>
<div o:end="[function () { console.log(2) }, function () { console.log(1) }]"></div>
```

并不推荐主动使用这种方法，尽量通过继承自动实现

#### `o:define`

定义一个模板标签，完成定义后将从文档中移除

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

所有`o:define`定义的新标签将会先以字符串数组的形式储存在定义时的父标签`o:backup`属性中，并从文档中移除

转化含有`o:backup`属性的标签时会解析其值并定义新标签。由于`o:define`定义新标签时父标签已经完成转化，所以不会重复定义

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

`o:on`定义的事件监听器方法中的事件对象名

#### `config.defineAttributeName` \<string>

定义新标签的属性名，默认值：`o:define`

#### `config.letAttributeName` \<string>

定义变量的属性名，默认值：`o:let`

#### `config.onAttributeName` \<string>

定义事件监听器的属性名的开头，默认值：`o:on`

#### `config.runAttributeName` \<string>

定义立刻执行方法的属性名，默认值：`o:run`

#### `config.endAttributeName` \<string>

定义最终执行方法的属性名，默认值：`o:end`

#### `config.backupAttributeName` \<string>

储存模板标签数组的属性名，默认值：`o:backup`

#### `config.injectAttributeName` \<string>

定义注入富文本的属性名，默认值：`o:inject`

#### `config.shadowAttributeName` \<string>

定义`attachShadow`的参数的属性名，默认值：`o:shadow`
