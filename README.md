stage
=====

sound visualizer template


## usage

```js
	STAGE.registerVisualizer( visualizer(container, data) )
```

when the visualizer callback is executed it will be passed 2 objects

```container``` is a dom handle

```data``` object contains a few properties that are continuously updated

### data properties

values are represented by a number between 0 and 1 where 0.26 = 26%

####```data.volume.all``` 
mean average of all frequencies

####```data.volume.highs``` 
mean average of high frequencies

####```data.volume.mids``` 
mean average of mid frequencies

####```data.volume.lows``` 
mean average of low frequencies


###```data.frequencies```
array of 128 values, each value represents a frequency

###```data.raw```
raw Uint8Array