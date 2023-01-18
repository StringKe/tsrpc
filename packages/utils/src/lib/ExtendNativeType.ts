interface Date {
    /**
     * Format a Date to string, pattern is below:
     * @param pattern - format string, like `"YYYY-MM-DD hh:mm:ss"`
     * 大写表示日期，小写一律表示时间，两位表示有前导0，一位表示无前导0
     * Uppercase represents date, lowsercase represents time
     * double char represents with prefix '0', single char represents without prefix '0'
     * Examples:
     * - YYYY/yyyy/YY/yy: year
     * - MM/M: month
     * - DD/D/dd/d: day
     * - HH/H/hh/h: hour(24)
     * - mm/m: minute
     * - ss/s: second
     * - Q/QQ: quater
     */
    format: (pattern?: string) => string
}

interface DateConstructor {
    today(): number
}

interface Array<T> {
    /**
     * 二分查找 前提是数组一定是有序的
     * @param value 要查找的值
     * @param keyMapper 要查找的值的mapper方法（默认为查找数组元素本身）
     * @return 查找到的index，查不到返回-1
     */
    binarySearch(
        value: number | string,
        keyMapper?: (v: T) => number | string,
    ): number

    /**
     * 二分插入 前提是数组一定是有序的
     * @param item 要插入的值
     * @param keyMapper 二分查找时要查找的值的mapper方法（默认为查找数组元素本身）
     * @param unique 是否去重，如果为true，则如果数组内已经有值时不插入，返回已有值的number
     * @return 返回插入的index位置
     */
    binaryInsert(item: T, unique?: boolean): number

    binaryInsert(
        item: T,
        keyMapper: (v: T) => number | string,
        unique?: boolean,
    ): number

    /**
     * 二分去重 前提是数组一定是有序的
     * @param keyMapper 二分查找时要查找的值的mapper方法（默认为查找数组元素本身）
     */
    binaryDistinct(keyMapper?: (v: T) => number | string): Array<T>
}
