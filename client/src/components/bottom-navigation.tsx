import { Home, Map, Users, Settings } from "lucide-react";
import { useLocation as useRouterLocation } from "wouter";

export default function BottomNavigation() {
  const [location, setLocation] = useRouterLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/map", icon: Map, label: "Map" },
    { path: "/contacts", icon: Users, label: "Contacts" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-mobile bg-white border-t border-gray-200 z-40">
      <div className="flex justify-around py-2">
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => setLocation(path)}
            className={`flex flex-col items-center py-2 px-4 transition-colors ${
              location === path
                ? "text-primary"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium mt-1">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
