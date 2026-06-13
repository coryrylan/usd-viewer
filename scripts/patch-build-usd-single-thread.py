#!/usr/bin/env python3
"""Patch the Autodesk USD fork's build_scripts/build_usd.py to produce a
single-threaded (no -pthread) WASM build.

The resulting emHdBindings.wasm does not declare shared memory, so it runs
without SharedArrayBuffer and therefore without the COOP/COEP cross-origin
isolation headers.

Every substitution is verified to match exactly once so the script fails
loudly if the upstream branch (adsk/feature/wasm) changes shape instead of
silently producing a still-threaded binary.

Usage: patch-build-usd-single-thread.py <path-to-build_usd.py>
"""

import sys

# (description, old, new) — each `old` must occur exactly once.
SUBSTITUTIONS = [
    (
        "drop -pthread from global emscripten linker flag constant",
        "EMSCRIPTEN_CMAKE_EXE_LINKER_FLAGS='-pthread'",
        "EMSCRIPTEN_CMAKE_EXE_LINKER_FLAGS=''",
    ),
    (
        "drop -pthread from global emscripten compile flag constant",
        "EMSCRIPTEN_CMAKE_CXX_FLAGS='-pthread --use-port=zlib'",
        "EMSCRIPTEN_CMAKE_CXX_FLAGS='--use-port=zlib'",
    ),
    (
        "drop -pthread from GetWasmCompilerFlags compile flags",
        "    compileFlags = '-pthread --use-port=zlib'",
        "    compileFlags = '--use-port=zlib'",
    ),
    (
        "drop -pthread from GetWasmCompilerFlags linker flags",
        "    linkerFlags = '-pthread'",
        "    linkerFlags = ''",
    ),
    (
        # oneTBB >= v2021.12.0 (the pinned version) supports building without
        # pthreads on Emscripten via this CMake option; without it oneTBB's
        # Clang.cmake re-injects -pthread on the Threads::Threads target.
        "tell oneTBB not to inject -pthread (EMSCRIPTEN_WITHOUT_PTHREAD)",
        '''            cmakeOptions += [
                '-DBUILD_SHARED_LIBS=OFF',
                '-DCMAKE_CXX_FLAGS="{}"'.format(compileFlags),
                '-DCMAKE_C_FLAGS="{}"'.format(compileFlags)
            ]''',
        '''            cmakeOptions += [
                '-DBUILD_SHARED_LIBS=OFF',
                '-DEMSCRIPTEN_WITHOUT_PTHREAD=ON',
                '-DCMAKE_CXX_FLAGS="{}"'.format(compileFlags),
                '-DCMAKE_C_FLAGS="{}"'.format(compileFlags)
            ]''',
    ),
    (
        # InstallDawnHeaders patches the emdawnwebgpu port to add -pthread.
        # Make that PatchFile call a no-op (old == new is skipped upstream).
        "stop re-adding -pthread to the emdawnwebgpu port",
        "             '''    flags = [opt_level_flag, '-pthread']''')",
        "             '''    flags = [opt_level_flag]''')",
    ),
]


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        source = f.read()

    if "EMSCRIPTEN_WITHOUT_PTHREAD" in source:
        print(f"[patch-single-thread] {path} already patched, nothing to do")
        return 0

    for description, old, new in SUBSTITUTIONS:
        count = source.count(old)
        if count != 1:
            print(
                f"[patch-single-thread] FAILED: {description}\n"
                f"  expected exactly 1 match, found {count}.\n"
                f"  Upstream build_usd.py has likely changed — update the\n"
                f"  substitutions in {sys.argv[0]} to match.",
                file=sys.stderr,
            )
            return 1
        source = source.replace(old, new)
        print(f"[patch-single-thread] applied: {description}")

    if "-pthread" in source:
        print(
            "[patch-single-thread] FAILED: '-pthread' still present after "
            "patching — upstream added new occurrences. Update this script.",
            file=sys.stderr,
        )
        return 1

    with open(path, "w", encoding="utf-8") as f:
        f.write(source)
    print(f"[patch-single-thread] wrote {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
