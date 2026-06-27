<?php

class WeeklySystem {
    /**
     * Helper untuk mendapatkan nama bulan dalam bahasa Indonesia
     */
    public static function getIndonesianMonthName(int $month): string {
        $months = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];
        return $months[$month] ?? 'Unknown';
    }

    /**
     * Konversi input bulan (angka atau string nama bulan) ke integer 1 - 12
     */
    public static function parseMonth($monthInput): int {
        if (is_numeric($monthInput)) {
            $m = (int)$monthInput;
            return ($m >= 1 && $m <= 12) ? $m : (int)date('n');
        }
        $str = strtolower(trim((string)$monthInput));
        $map = [
            'januari' => 1, 'january' => 1, 'jan' => 1,
            'februari' => 2, 'february' => 2, 'feb' => 2,
            'maret' => 3, 'march' => 3, 'mar' => 3,
            'april' => 4, 'apr' => 4,
            'mei' => 5, 'may' => 5,
            'juni' => 6, 'june' => 6, 'jun' => 6,
            'juli' => 7, 'july' => 7, 'jul' => 7,
            'agustus' => 8, 'august' => 8, 'aug' => 8,
            'september' => 9, 'sep' => 9,
            'oktober' => 10, 'october' => 10, 'oct' => 10,
            'november' => 11, 'nov' => 11,
            'desember' => 12, 'december' => 12, 'dec' => 12
        ];
        return $map[$str] ?? (int)date('n');
    }

    /**
     * Helper internal: Mencari tanggal Jumat terakhir pada suatu bulan & tahun tertentu.
     */
    private static function getLastFridayOfMonth(int $year, int $month): DateTime {
        $dateStr = sprintf("%04d-%02d-01", $year, $month);
        $dt = new DateTime($dateStr);
        $lastDayStr = sprintf("%04d-%02d-%02d", $year, $month, $dt->format('t'));
        $lastDay = new DateTime($lastDayStr);
        
        if ($lastDay->format('N') == 5) { // 5 = Jumat (ISO 8601)
            $lastFriday = clone $lastDay;
        } else {
            $lastFriday = new DateTime("last friday of " . $dt->format('F Y'));
        }
        $lastFriday->setTime(0, 0, 0);
        return $lastFriday;
    }

    /**
     * TUGAS 1: Menentukan Week ke-berapa dan Bulan apa berdasarkan Tanggal Input / Hari Ini
     * 
     * @param string|null $inputDate Format YYYY-MM-DD (Default: hari ini)
     * @return array
     */
    public static function getWeeksInMonthCount(int $year, int $month): int {
        $prevM = ($month == 1) ? 12 : $month - 1;
        $prevY = ($month == 1) ? $year - 1 : $year;
        $start = self::getLastFridayOfMonth($prevY, $prevM);
        $end = self::getLastFridayOfMonth($year, $month);
        $days = (int)round(($end->getTimestamp() - $start->getTimestamp()) / 86400);
        return (int)round($days / 7);
    }

    public static function getWeekFromDate(?string $inputDate = null): array {
        if (!$inputDate) {
            $inputDate = date('Y-m-d');
        }
        
        $dt = new DateTime($inputDate);
        $dt->setTime(0, 0, 0);
        
        $y = (int)$dt->format('Y');
        $m = (int)$dt->format('n');
        
        // Cari Jumat terakhir di bulan kalender saat ini ($m)
        $lastFridayCurrentMonth = self::getLastFridayOfMonth($y, $m);
        
        if ($dt >= $lastFridayCurrentMonth) {
            // Jika tanggal >= Jumat terakhir bulan saat ini, maka masuk ke Week 1 Bulan Berikutnya
            $assignedMonth = $m + 1;
            $assignedYear = $y;
            if ($assignedMonth > 12) {
                $assignedMonth = 1;
                $assignedYear++;
            }
            $week1Start = clone $lastFridayCurrentMonth;
        } else {
            // Masuk ke bulan sistem yang sama dengan bulan kalender
            $assignedMonth = $m;
            $assignedYear = $y;
            
            // Start Week 1 ditarik mundur dari Jumat terakhir bulan sebelumnya
            $prevM = $m - 1;
            $prevY = $y;
            if ($prevM < 1) {
                $prevM = 12;
                $prevY--;
            }
            $week1Start = self::getLastFridayOfMonth($prevY, $prevM);
        }
        
        $diffDays = $week1Start->diff($dt)->days;
        $weekNumber = (int)floor($diffDays / 7) + 1;
        
        // Hitung batas range minggu tersebut
        $currentWeekStart = clone $week1Start;
        if ($weekNumber > 1) {
            $currentWeekStart->modify('+' . (($weekNumber - 1) * 7) . ' days');
        }
        $currentWeekEnd = clone $currentWeekStart;
        $currentWeekEnd->modify('+6 days');
        
        $maxW = self::getWeeksInMonthCount($assignedYear, $assignedMonth);
        $globalWeekIndex = (($assignedMonth - 1) * 5) + min($weekNumber - 1, $maxW - 1);

        return [
            'input_date'        => $dt->format('Y-m-d'),
            'week'              => $weekNumber,
            'month'             => $assignedMonth,
            'month_name'        => self::getIndonesianMonthName($assignedMonth),
            'year'              => $assignedYear,
            'label'             => "Week {$weekNumber} " . self::getIndonesianMonthName($assignedMonth) . " {$assignedYear}",
            'week_start_date'   => $currentWeekStart->format('Y-m-d'),
            'week_end_date'     => $currentWeekEnd->format('Y-m-d'),
            'weeks_in_month'    => $maxW,
            'global_week_index' => $globalWeekIndex
        ];
    }

    /**
     * TUGAS 2: Mengambil range Tanggal Mulai (Start Date) dan Tanggal Selesai (End Date) 
     * berdasarkan parameter Bulan X dan Week Y
     * 
     * @param int|string $month Bulan (1-12 atau nama bulan seperti 'Juni')
     * @param int $week Week ke-Y (1, 2, 3, dst.)
     * @param int|null $year Tahun (Default: tahun saat ini)
     * @return array
     */
    public static function getDateRangeFromWeek($month, int $week, ?int $year = null): array {
        $m = self::parseMonth($month);
        $y = $year ?: (int)date('Y');
        $w = max(1, $week);
        
        // Week 1 dimulai dari Jumat terakhir bulan sebelumnya (M-1)
        $prevM = $m - 1;
        $prevY = $y;
        if ($prevM < 1) {
            $prevM = 12;
            $prevY--;
        }
        
        $week1Start = self::getLastFridayOfMonth($prevY, $prevM);
        
        $startDate = clone $week1Start;
        if ($w > 1) {
            $startDate->modify('+' . (($w - 1) * 7) . ' days');
        }
        
        $endDate = clone $startDate;
        $endDate->modify('+6 days');
        
        return [
            'month'      => $m,
            'month_name' => self::getIndonesianMonthName($m),
            'year'       => $y,
            'week'       => $w,
            'label'      => "Week {$w} " . self::getIndonesianMonthName($m) . " {$y}",
            'start_date' => $startDate->format('Y-m-d'),
            'start_time' => $startDate->format('Y-m-d 00:00:00'),
            'end_date'   => $endDate->format('Y-m-d'),
            'end_time'   => $endDate->format('Y-m-d 23:59:59')
        ];
    }
}
