node        := node_modules
pkg_lock    := yarn.lock
pkg_config  := package.json
libs        := jest
clutter     := $(node)

default: test

build: $(node)

$(node): $(pkg_lock)

$(pkg_lock): $(pkg_config)
	yarn install

$(pkg_config):
	yarn init -y
	yarn add $(libs)

test: build
	yarn run jest

coverage: build
	yarn run jest --coverage

clean:

cleanall: clean
	rm -rf $(clutter)
