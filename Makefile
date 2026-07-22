.PHONY: dev dev-web

dev:
	npm --prefix cli-gui run dev:status

dev-web:
	npm --prefix cli-gui run dev
