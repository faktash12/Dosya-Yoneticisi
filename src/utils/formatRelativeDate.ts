export const formatRelativeDate = (isoDate: string): string => {
  const timestamp = new Date(isoDate).getTime();
  const diffMs = Date.now() - timestamp;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    return 'simdi';
  }

  if (diffHours < 24) {
    return `${diffHours} sa once`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gun once`;
};

