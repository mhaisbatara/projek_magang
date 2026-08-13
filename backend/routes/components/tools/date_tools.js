/**
 * @project Sistem Klinik
 * @file date_tools.js
 * @description Helper format tanggal untuk sistem (timezone Asia/Jakarta)
 */

import { formatInTimeZone } from "date-fns-tz";

export const TIMEZONE = "Asia/Jakarta";

export const formatDateSystem = (date = new Date()) => {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd HH:mm:ss XXX");
};
