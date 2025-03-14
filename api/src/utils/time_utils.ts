// Convert the timestamp string to ISO-8601 format
const formatTimestamp = (timestamp: string) => {
    // Extract components from the string
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    const second = timestamp.substring(12, 14);

    // Format into ISO-8601
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
};


export { formatTimestamp }