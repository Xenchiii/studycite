set -e
cd "$(dirname "$0")"
FLAGS="-O3 -nostdlib -fno-exceptions -fno-rtti -Wl,--no-entry -Wl,--strip-all"
if command -v clang >/dev/null 2>&1; then
  clang++ --target=wasm32 $FLAGS -o ../src/kernel.wasm kernel.cpp
else
  python3 -m ziglang c++ -target wasm32-freestanding $FLAGS -o ../src/kernel.wasm kernel.cpp
fi
echo "built src/kernel.wasm ($(wc -c <../src/kernel.wasm) bytes)"
