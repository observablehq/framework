# Executable data loader examples

Observable Framework supports arbitrary executable (.exe) data loaders, which *can* be any arbitrary executable (*e.g.* compiled from C) but often specify another interpreter using a shebang as shown in the examples below. Executable (.exe) data loaders require that you add the executable bit, typically done via `chmod`. For example:

```sh
chmod +x docs/quakes.csv.exe
```

## PNG (with R interpreter)


