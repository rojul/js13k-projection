dev: build
	@printf '\n\n\n'
	@rm -rf dist* .cache
	npm run dev

build:
	@rm -rf dist* .cache
	npx parcel build --no-source-maps src/index.html
	npx rollup -c
	echo "$$(cat dist/index.html | sed 's/ <script.*//')<script>$$(cat dist/index.js)</script></body></html>" > dist/index.html
	cd dist && zip -9 ../dist.zip index.html
	wc -c *.zip
