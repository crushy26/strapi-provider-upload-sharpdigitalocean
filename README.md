# strapi-provider-upload-sharpdigitalocean

strapi @beta
Resize your uploaded images to two variants
change extensions/file-upload settings to Local upload resize

    npm i strapi-provider-upload-sharpdigitalocean

sharp nodejs resizing library https://github.com/lovell/sharp

make sure the attributes 'url' and 'thumb exists in your in

    extensions/uploads/models/File.settings.json

No UI fields yet, but feel free to change the lib/index.js to add variants or change sizes
Resources
