// export const extractFileId = (url) => {
//   try {
//     const parts = url.split("/");
//     const fileName = parts[parts.length - 1];
//     const fileId = fileName.split("?")[0]; // clean params
//     return fileId;
//   } catch (err) {
//     return null;
//   }
// };

export const extractFileId = (url) => {
  try {
    const parts = url.split("/");

    // Get last part (filename)
    const fileName = parts[parts.length - 1];

    // remove query params if exist
    const cleanFileName = fileName.split("?")[0];

    return cleanFileName;
  } catch {
    return null;
  }
};