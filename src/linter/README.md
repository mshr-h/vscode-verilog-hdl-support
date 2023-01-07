# SlanLinter.ts Description

## Slang's Building & Installation
Since Slang latest version (=2.0) is `cmake --install` failed, the installation procedure by v1.0 is described.
```sh
# OS: Ubuntu 22.04.1 LTS (Jammy Jellyfish)
sudo apt-get install -y g++ cmake
cd /usr/local/src
sudo git clone https://github.com/MikePopoloski/slang.git
cd slang
sudo git checkout v1.0
sudo cmake -B build
sudo cmake --build build
sudo cmake --install build --strip --prefix /usr/local/slang-v1.0
cd /usr/local/bin
sudo ln -s /usr/local/slang-v1.0/bin/slang slang
```
# Slang's Regular expression sample
sample can be found on 
[Slang website Warning Reference](https://sv-lang.com/warning-ref.html#bad-procedural-force)

# SlangLinter.ts Demonstration procedure
1. VSCode's Lanuch Extension (=F5 key).
2. Open Directory [src/linter/tests](src/linter/tests) at host window.
3. Start Slang linter and stack warnings in problem tab, When open display verilog file on editor window.
