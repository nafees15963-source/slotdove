export default function Loading() {
  return (
    <main className="app-content">
      <div className="skeleton" style={{ width: 240, height: 30, marginBottom: 30 }} />
      <div className="grid-4">
        {[0, 1, 2, 3].map((i) => (
          <div className="panel panel-body" key={i}>
            <div className="skeleton" />
            <div className="skeleton" style={{ height: 50, marginTop: 20 }} />
          </div>
        ))}
      </div>
    </main>
  );
}
