export default function Page({ title, children }) {
  return (
    <div className="min-h-screen w-full px-4 sm:px-6 lg:px-8 py-6">
      {title ? (
        <header className="mb-6">
          <h1 className="text-center text-2xl sm:text-3xl font-semibold tracking-tight">
            {title}
          </h1>
        </header>
      ) : null}

      <main
        className="
          mx-auto
          w-full
          max-w-7xl
          /* grid centrada y responsiva */
          grid
          justify-center
          gap-4 sm:gap-6 lg:gap-8
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-4
        "
      >
        {children}
      </main>
    </div>
  );
}