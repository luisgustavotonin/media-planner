import React from 'react';

export function withProtectedPage(Component, requiredPermission) {
  return function ProtectedComponent(props) {
    return <Component {...props} />;
  };
}