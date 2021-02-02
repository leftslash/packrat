node        := node_modules
pkg_mgr     != which yarn || echo error_yarn_not_found
pkg_lock    := yarn.lock
pkg_config  := package.json
libs        := jest
clutter     := $(node)

default: test

echo:
	@echo $(pkg_mgr)

build: $(node)

$(node): $(pkg_lock)

$(pkg_lock): $(pkg_mgr) $(pkg_config)
	yarn install
	touch $@

$(pkg_config): $(pkg_mgr)
	yarn init -y
	yarn add $(libs)

test: build
	yarn run jest

coverage: build
	yarn run jest --coverage

$(pkg_mgr):
	@echo "yarn is not installed, please install yarn"
	@exit 1

clean:

cleanall: clean
	rm -rf $(clutter)
