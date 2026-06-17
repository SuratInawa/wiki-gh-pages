#!/bin/sh

# Install tiddlywiki
npm install tiddlywiki

# Prepare dist folder so index.html and static/ live side by side
mkdir -p dist/static

# Copy the live wiki to dist root so it is served at /
cp index.html dist/index.html

# REQUIREMENT A: Copy all files from the root folder to the dist deployment root
if [ -d "./root" ]; then
  cp -r ./root/* ./dist/
fi

# Unpack single file wiki into wiki folder
node node_modules/tiddlywiki/tiddlywiki.js --load index.html --savewikifolder ./wiki

# Render each non-system tiddler keeping percent signs safe for proper multi-script decoding
node node_modules/tiddlywiki/tiddlywiki.js ./wiki --output ./dist --render '[!is[system]]' '[split[:]join[-]split[/]join[-]split[\]join[-]split[ ]join[-]split[?]join[-]split[<]join[-]split[>]join[-]split[|]join[-]split[*]join[-]split["]join[-]split[#]join[-]addprefix[static/]addsuffix[.html]]' 'text/plain' '$:/core/templates/static.tiddler.html'

# Render the css as an external file
node node_modules/tiddlywiki/tiddlywiki.js ./wiki --output ./dist --render '$:/core/templates/static.template.css' 'static/static.css' 'text/plain'

# Render the index page using standard TiddlyWiki rendering
node node_modules/tiddlywiki/tiddlywiki.js ./wiki --output ./dist --render '$:/core/templates/static.template.html' 'static/index.html' 'text/plain'

# Run our updated post-processing code to handle banners and fix links
node post-process.js

# Remove the wiki folder
rm -rf ./wiki
