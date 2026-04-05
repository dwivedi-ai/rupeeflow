import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  Plus, 
  Zap,
  TrendingUp,
  Settings,
  User,
  X
} from 'lucide-react';
import clsx from 'clsx';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard',
    },
    {
      name: 'All Transactions',
      href: '/transactions',
      icon: Receipt,
      current: location.pathname === '/transactions',
    },
    {
      name: 'Add Transaction',
      href: '/transactions/add',
      icon: Plus,
      current: location.pathname === '/transactions/add',
    },
    {
      name: 'Smart Add',
      href: '/transactions/smart-add',
      icon: Zap,
      current: location.pathname === '/transactions/smart-add',
    },
  ];

  const secondaryNavigation = [
    {
      name: 'Analytics',
      href: '/analytics',
      icon: TrendingUp,
      current: location.pathname === '/analytics',
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      current: location.pathname === '/profile',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: location.pathname === '/settings',
    },
  ];

  const closeSidebar = () => {
    if (setSidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={closeSidebar} />
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={closeSidebar}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h2 className="text-lg font-semibold text-gray-900">RupeeFlow</h2>
              </div>
              
              <nav className="mt-8 px-3 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={closeSidebar}
                      className={clsx(
                        'group w-full flex items-center pl-3 pr-2 py-2 text-sm font-medium rounded-md transition-colors',
                        item.current
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'mr-3 h-5 w-5 flex-shrink-0',
                          item.current ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-8">
                <div className="px-3 mb-3">
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    More
                  </h3>
                </div>
                <nav className="px-3 space-y-1">
                  {secondaryNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={closeSidebar}
                        className={clsx(
                          'group w-full flex items-center pl-3 pr-2 py-2 text-sm font-medium rounded-md transition-colors',
                          item.current
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <Icon
                          className={clsx(
                            'mr-3 h-5 w-5 flex-shrink-0',
                            item.current ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                          )}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-16 lg:z-50">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex flex-col flex-grow">
            {/* Primary Navigation */}
            <nav className="px-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'group w-full flex items-center pl-3 pr-2 py-2 text-sm font-medium rounded-md transition-colors',
                      item.current
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'mr-3 h-5 w-5 flex-shrink-0',
                        item.current ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Secondary Navigation */}
            <div className="mt-8">
              <div className="px-3 mb-3">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  More
                </h3>
              </div>
              <nav className="px-3 space-y-1">
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={clsx(
                        'group w-full flex items-center pl-3 pr-2 py-2 text-sm font-medium rounded-md transition-colors',
                        item.current
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'mr-3 h-5 w-5 flex-shrink-0',
                          item.current ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-4 border-t border-gray-200">
            <div className="space-y-2">
              <Link
                to="/transactions/smart-add"
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                <Zap className="h-4 w-4 mr-2" />
                Quick Add
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
