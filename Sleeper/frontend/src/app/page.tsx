import LeagueInput from "@/components/LeagueInput";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-2 text-sleeper-accent-light">
          Playoff Predictor
        </h1>
        <p className="text-sleeper-muted mb-8">
          Enter your Sleeper league ID to see playoff odds and explore what-if scenarios.
        </p>
        <LeagueInput />
      </div>
    </main>
  );
}
