## Initial setup

`npm install`

## Settings

Create a file at the root of the directory named `settings.json`. Begin with the code below.

```
{
  "manyToMany": {
    "from": [
      ...Array of absolute paths to ember addons
    ],
    "to": [
      ...Array of absolute paths to ember apps
    ] 
  },
  "browserSyncSites": [
    ...Array of ports
  ]
}
```

### manyToMany

The files from th `/addon` and `/app` directories from all addons in `from` will b synced to the corresponding `node_modules` directory in each ember app in the `to` array.

### browserSyncPorts

Supply an array of localhost ports that you want to serve over the Wifi network that you're connected to. This is useful for viewing a local site on multiple devices, but note that the site will become viewable by anyone on the same Wifi network. Any sites running on those ports will be served using Browsersync- the sharable urls will be listed in the console when f gulp starts.

## Start gulp

`gulp`

