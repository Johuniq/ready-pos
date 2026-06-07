import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Logo from "../Icons/Logo";
import { useLocation } from "react-router-dom";
import { Icons } from "../Icons/icons";
import { clsx } from "clsx";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar/Avatar";
import { Button } from "@/components/ui/button";
import { MenuItem, menuPopoverClass, menuContentClass } from "../menu/Menu";
import { MenuTrigger, Menu, Popover } from "react-aria-components";
import { ModeToggle } from "../mode-toggle";

/**
 * Convert a string to start case (capitalize first letter of each word)
 * @param {string} str - The string to convert
 * @returns {string} The converted string
 */
const _startcase = (str) => {
  return str
    .toLowerCase() // Convert the whole string to lowercase
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/-/g, " ") // Replace hyphens with spaces
    .split(" ") // Split the string into words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize the first letter of each word
    .join(" "); // Join the words back into a string
};
const navigation = [
  {
    name: "Dashboard",
    href: "dashboard",
    icon: Icons.DashboardIcon,
    current: true,
  },
  {
    name: "Inbox",
    href: "inbox",
    icon: Icons.CommonInboxIcon,
    current: false,
  },

  {
    name: "Settings",
    href: "settings",
    icon: Icons.SettingsIcon,
    current: false,
  },
];

const ApplicationLayout = () => {
  // const showApplicationLayout = true;
  const showApplicationLayout = !window.readyPosAdmin?.isAdmin;
  const navigate = useNavigate();
  let location = useLocation();
  const pageTitle = location.pathname.split("/")[1];

  useEffect(() => {
    if (pageTitle) {
      navigate(pageTitle);
    } else {
      navigate(navigation[0].href);
    }
  }, []);

  useEffect(() => {
    if (pageTitle) {
      window.document.title = _startcase(pageTitle);
    } else {
      window.document.title = _startcase(navigation[0].href);
    }
  }, [pageTitle]);

  const handleLogout = () => {
    // Clear any local storage or session data
    try {
      localStorage.removeItem('readypos_session');
      sessionStorage.clear();
    } catch (e) {
      
    }

    // Redirect to WordPress logout URL
    // WordPress will handle the logout and redirect back to wp-login.php
    const logoutUrl = '/wp-admin/admin.php?page=ready-pos';
    const wpLogoutUrl = `/wp-login.php?action=logout&redirect_to=${encodeURIComponent(logoutUrl)}`;
    
    window.location.href = wpLogoutUrl;
  };

  return (
    <div className="bg-background">
      {showApplicationLayout ? (
        <div className="min-h-[calc(100vh-32px)] w-full absolute bg-background !font-sans">
          <div className="flex flex-row min-h-[calc(100vh-32px)] w-full">
            <div className="w-60 border-r border-border-default">
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background pb-4">
                <div
                  style={{ marginBottom: "3px" }}
                  className="flex h-10 shrink-0 items-center pt-4 px-6">
                  <Logo />
                  <p className="pl-2 font-semibold text-lg font-sans">
                    Plugin Name
                  </p>
                </div>

                <nav className="flex flex-1 flex-col">
                  <ul className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul className="space-y-1">
                        {navigation.map((item) => (
                          <li key={item.name} className="flex flex-row">
                            <span
                              className={clsx(
                                "w-2 bg-transparent",
                                item.href === pageTitle && "bg-primary",
                              )}></span>

                            <NavLink
                              to={item.href}
                              className={clsx(
                                "focus:shadow-none w-full group flex gap-x-3 leading-6  pl-4 py-2 pb-2  border-b  border-t text-sm focus:text-foreground",
                                item.href === pageTitle
                                  ? "text-foreground !border-border-default !shadow-border font-medium"
                                  : "border-transparent font-normal text-muted-foreground",
                              )}>
                              <item.icon
                                className={clsx(
                                  item.href === pageTitle
                                    ? "stroke-blue-700 font-medium"
                                    : "stroke-gray-600 font-normal",
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
            <div className="w-full  flex flex-col">
              <div className="sticky flex justify-between h-16  items-center gap-x-4 border-b bg-background border-border-default px-4 shadow-border sm:gap-x-6 sm:px-6">
                <div className="font-medium text-xl text-foreground">
                  {_startcase(pageTitle)}
                </div>
                <div className="flex flex-row gap-2 items-center justify-center">
                  <MenuTrigger>
                    <Button variant="ghost" size="icon">
                      <div className="flex flex-row gap-2 items-center justify-center">
                        <div className="flex gap-4">
                          <ModeToggle />
                          <Avatar>
                            <AvatarImage
                              src={window.readyPosAdmin?.userInfo?.avatar}
                              alt={window.readyPosAdmin?.userInfo?.username}
                            />
                            <AvatarFallback>CN</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="text-neutral-600 text-xs font-medium leading-none">
                          {window.readyPosAdmin?.userInfo?.username}
                        </div>
                        <div className="text-neutral-600 text-xs font-medium leading-none">
                          <Icons.DownIcon />
                        </div>
                      </div>
                    </Button>

                    <Popover className={menuPopoverClass()}>
                      <Menu
                        selectionMode="single"
                        onSelectionChange={(key) => {
                          const selectedKey = Array.from(key)[0];
                          if (selectedKey === 'logout') {
                            handleLogout();
                          }
                        }}
                        className={menuContentClass()}>
                        <MenuItem id="logout">Log out</MenuItem>
                      </Menu>
                    </Popover>
                  </MenuTrigger>
                </div>
              </div>
              <div>
                <main className="bg-background top-0 b-0 ">
                  <Outlet />
                </main>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <main className="bg-background w-full min-h-[calc(100vh-32px)] absolute">
            <div className="sticky flex justify-between h-16 items-center gap-x-4 border-b bg-background border-border-default px-4 shadow-border sm:gap-x-6 sm:px-6">
              <div className="font-medium text-xl text-foreground">
                {_startcase(pageTitle)}
              </div>
              <div className="flex flex-row gap-2 items-center justify-center">
                <ModeToggle />
              </div>
            </div>
            <div>
              <main className="bg-background top-0 b-0 ">
                <Outlet />
              </main>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default ApplicationLayout;
