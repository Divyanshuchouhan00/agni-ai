import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Workspace from '@/components/Workspace';
import BottomPanel from '@/components/BottomPanel';

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background text-foreground selection:bg-accent/30 selection:text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar />
        <Workspace />
      </div>
      <BottomPanel />
    </div>
  );
}
