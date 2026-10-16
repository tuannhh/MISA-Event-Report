export const LOGIN_PATH = '/log-in';
export const EVENTS_PATH = '/su-kien';
export const PASSWORD_PATH = '/change-password';
export const eventFeatures = ['tong-quan', 'du-lieu', 'nguon-du-lieu', 'muc-tieu', 'thanh-vien', 'nhat-ky'];

// A successful login always starts at the event chooser, even from an expired deep link.
export function destination(pathname, user, afterLogin = false) {
  if (!user) return {screen: 'login', path: LOGIN_PATH};
  if (user.must_change_password) return {screen: 'password', path: PASSWORD_PATH};
  if (afterLogin || ['/', LOGIN_PATH, EVENTS_PATH, PASSWORD_PATH].includes(pathname.replace(/\/$/, '') || '/')) {
    return {screen: 'events', path: EVENTS_PATH};
  }
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2 && eventFeatures.includes(parts[1])) {
    return {screen: 'event', slug: parts[0], feature: parts[1]};
  }
  return {screen: 'events', path: EVENTS_PATH, missing: true};
}

export const canEditEvent = event => ['editor', 'admin', 'super_admin'].includes(event?.role);
