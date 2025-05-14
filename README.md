# vimeo-ott-datalayer

The aim of this project is to replicate the enhanced measurement capabilities of Google Analytics 4 when being used with embedded YouTube videos, but when using a Vimeo OTT player instead.

# Installation

Load the file `https://cdn.jsdelivr.net/gh/cqvo/vimeo-ott-datalayer/vimeo-ott-datalayer.min.js` on the pages where tracking is needed for embedded videos.

## Direct Load

Add the following to the page's `<head>`:

```html
<script src="https://cdn.jsdelivr.net/gh/cqvo/vimeo-ott-datalayer/vimeo-ott-datalayer.min.js"></script>
```

## Google Tag Manager

1. Create a new **Custom HTML** tag
2. Add the snippet from the "Direct Load" section above to the tag body
3. Assign a trigger and save - recommend using "Initialization - All Pages"