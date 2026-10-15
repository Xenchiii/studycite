import wasmModule from "./kernel.wasm";

let exports_;
const kernel = () =>
  (exports_ ??= new WebAssembly.Instance(wasmModule, {}).exports);

let generation = 0;

export function createScorer(indptr, indices, values, capacity) {
  const n = indptr.length - 1;
  let st = null;

  const load = () => {
    const k = kernel();
    k.reset();
    generation++;

    const bytes = (a) => Math.max(4, a.byteLength);
    const p = {
      ip: k.alloc(bytes(indptr)),
      ix: k.alloc(bytes(indices)),
      v: k.alloc(bytes(values)),
      q: k.alloc(Math.max(4, capacity * 4)),
      c: k.alloc(Math.max(4, n * 4)),
      o: k.alloc(Math.max(4, n * 4)),
    };
    if (!Object.values(p).every(Boolean))
      throw new Error("Kernel out of memory");
    const mem = k.memory.buffer;
    new Int32Array(mem, p.ip, indptr.length).set(indptr);
    new Int32Array(mem, p.ix, indices.length).set(indices);
    new Float32Array(mem, p.v, values.length).set(values);
    st = {
      gen: generation,
      p,
      q: new Float32Array(mem, p.q, capacity),
      c: new Float32Array(mem, p.c, n),
      o: new Float32Array(mem, p.o, n),
    };
  };
  load();

  return {
    score(query) {
      if (query.length > capacity)
        throw new Error("Query longer than scorer capacity");
      if (st.gen !== generation) load();
      st.q.set(query);
      const { p } = st;
      const rc = kernel().score_chunks(
        n,
        p.ip,
        p.ix,
        p.v,
        p.q,
        query.length,
        p.c,
        p.o,
      );
      if (rc !== 0) throw new Error(`score_chunks failed (${rc})`);
      return { cosine: st.c.slice(), coverage: st.o.slice() };
    },
  };
}
