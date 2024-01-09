# Date

The Date input specifies a date.

```js echo
const date = view(Inputs.date())
```

```js echo
date
```

We recommend providing a *label* to improve usability. You can also supply an initial *value*; this can be specified as a Date instance, a string of the form *YYYY-MM-DD*, or the corresponding number of milliseconds since UNIX epoch.

```js echo
const start = view(Inputs.date({label: "Start", value: "2021-09-21"}))
```

```js echo
start
```

The value of a date input is a [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) instance at UTC midnight, or null if an initial value is not specified. If the *required* option is set to true, then the initial value of the date input will be undefined instead of null, causing referencing cells to wait until a valid input is entered.

```js echo
const rdate = view(Inputs.date({label: "Date", required: true}))
```

```js echo
rdate
```

The datetime input is similar to the date input, except it allows a time to be specified in addition to a date. The time is specified in the user’s local time zone (for you, that’s ${Intl.DateTimeFormat().resolvedOptions().timeZone}). Like a date input, the value is exposed as a Date instance. Dates are formatted by the Observable inspector as UTC; note the `Z`.

```js echo
const datetime = view(Inputs.datetime({label: "Moment"}))
```

```js echo
datetime
```

The *min* and *max* option allow you to set a lower and upper bound for valid inputs. Like the *value* option, these options may be specified either as a Date instance, as *YYYY-MM-DD* strings, or epoch milliseconds.

```js echo
const birthday = view(Inputs.date({label: "Birthday", min: "2021-01-01", max: "2021-12-31"}))
```

```js echo
birthday
```

If the input will trigger some expensive calculation, such as fetching from a remote server, the *submit* option can be used to defer the input from reporting the new value until the user clicks the Submit button or hits Enter. The value of *submit* can also be the desired contents of the submit button (a string or HTML).

```js echo
const sdate = view(Inputs.date({label: "Date", submit: true}))
```

```js echo
sdate
```

To prevent the value from being changed, use the *disabled* or *readonly* option.

```js echo
const fixed = view(Inputs.date({label: "Fixed date", value: "2021-01-01", disabled: true}))
```

```js echo
fixed
```

```js echo
const readonly = view(Inputs.date({label: "Readonly date", value: "2021-01-01", readonly: true}))
```

```js echo
readonly
```