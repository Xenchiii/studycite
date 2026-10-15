typedef __SIZE_TYPE__ size_t;

#define EXPORT(name) __attribute__((export_name(name)))
#define PAGE 65536u

#if defined(__wasm__)
static inline size_t mem_pages(void) { return (size_t)__builtin_wasm_memory_size(0); }
static inline size_t mem_grow(size_t pages) { return (size_t)__builtin_wasm_memory_grow(0, pages); }
#else
static inline size_t mem_pages(void) { return 0; }
static inline size_t mem_grow(size_t) { return (size_t)-1; }
#endif

extern "C" {

extern unsigned char __heap_base;
static size_t heap_ptr = 0;

EXPORT("reset") void reset(void) { heap_ptr = (size_t)&__heap_base; }

EXPORT("alloc") void *alloc(size_t bytes) {
  if (heap_ptr == 0)
    reset();
  size_t start = (heap_ptr + 7) & ~(size_t)7;
  if (start < heap_ptr || bytes > (size_t)-1 - start)
    return 0;
  size_t end = start + bytes;
  size_t have = mem_pages() * PAGE;
  if (end > have) {
    size_t pages = (end - have + PAGE - 1) / PAGE;
    if (mem_grow(pages) == (size_t)-1)
      return 0;
  }
  heap_ptr = end;
  return (void *)start;
}

EXPORT("score_chunks")
int score_chunks(int n_chunks, const int *indptr, const int *indices,
                 const float *values, const float *query, int vocab,
                 float *out_cosine, float *out_coverage) {
  if (n_chunks < 0 || vocab <= 0)
    return -1;
  if (n_chunks == 0)
    return 0;
  if (!indptr || !indices || !values || !query || !out_cosine || !out_coverage)
    return -3;

  if (indptr[0] < 0)
    return -2;
  for (int i = 0; i < n_chunks; ++i)
    if (indptr[i + 1] < indptr[i])
      return -2;

  double qnorm = 0.0, qtotal = 0.0;
  for (int j = 0; j < vocab; ++j) {
    double q = query[j];
    if (q > 0.0) {
      qnorm += q * q;
      qtotal += q;
    }
  }
  qnorm = __builtin_sqrt(qnorm);

  for (int i = 0; i < n_chunks; ++i) {
    double dot = 0.0, cnorm = 0.0, covered = 0.0;
    for (int k = indptr[i]; k < indptr[i + 1]; ++k) {
      double v = values[k];
      int idx = indices[k];
      cnorm += v * v;
      if (idx >= 0 && idx < vocab) {
        double q = query[idx];
        if (q > 0.0) {
          dot += v * q;
          covered += q;
        }
      }
    }

    double cosine = 0.0;
    if (qnorm > 0.0 && cnorm > 0.0)
      cosine = dot / (__builtin_sqrt(cnorm) * qnorm);
    if (cosine > 1.0)
      cosine = 1.0;
    out_cosine[i] = (float)cosine;

    double cov = qtotal > 0.0 ? covered / qtotal : 0.0;
    out_coverage[i] = (float)(cov > 1.0 ? 1.0 : cov);
  }
  return 0;
}

}