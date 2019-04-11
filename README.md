## Initial setup

`npm install`

## Settings

Create a file at the root of the directory named `settings.json`. Begin with the code below.

```
{
  "emberAddons": [],
  "emberApps": [], 
  "browserSyncSites": []
}
```

### emberAddons

Supply an array of paths to the ember addons that your ember applications will be synced with.

### emberApps

Supply an array of paths to the ember applications whose node modules will be synced with the addons listed in the `emberAddons object.

### browserSyncSites

Supply an array of localhost ports that you want to serve over the Wifi network that you're connected to. This is useful for viewing a local site on multiple devices, but note that the site will become viewable by anyone on the same Wifi network. Any sites running on those ports will be served using Browsersync- the sharable urls will be listed in the console when f gulp starts.

## Start gulp

`gulp`

