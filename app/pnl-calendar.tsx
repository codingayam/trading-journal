"use client";

import { useMemo, useState } from "react";
import {
  buildMonthlyPnlCalendar,
  dateKey,
  type CalendarDay,
  type CalendarTrade,
} from "@/lib/pnl-calendar";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function detailMoney(value: number | null) {
  if (value === null) {
    return "Open";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function yearOptions(trades: CalendarTrade[], selectedYear: number) {
  const years = trades
    .map((trade) => trade.exitDateTime ?? trade.entryDateTime)
    .map((value) => new Date(value).getFullYear())
    .filter((year) => Number.isFinite(year));

  const minYear = Math.min(selectedYear - 1, ...years);
  const maxYear = Math.max(selectedYear + 1, ...years);

  return Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
}

function dayTone(day: CalendarDay) {
  if (day.tradeCount === 0) {
    return "";
  }

  return day.pnl >= 0 ? " pnl-day-positive" : " pnl-day-negative";
}

export function PnlCalendar({ trades }: { trades: CalendarTrade[] }) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKey(today));

  const calendar = useMemo(
    () => buildMonthlyPnlCalendar(trades, selectedYear, selectedMonth),
    [selectedMonth, selectedYear, trades],
  );
  const selectedDay =
    calendar.days.find((day) => day.dateKey === selectedDateKey) ??
    calendar.days.find((day) => day.inMonth && day.tradeCount > 0) ??
    calendar.days.find((day) => day.inMonth) ??
    calendar.days[0];
  const years = yearOptions(trades, selectedYear);

  function moveMonth(offset: number) {
    const next = new Date(selectedYear, selectedMonth + offset, 1);
    setSelectedYear(next.getFullYear());
    setSelectedMonth(next.getMonth());
    setSelectedDateKey(dateKey(next));
  }

  function selectMonth(value: string) {
    const nextMonth = Number(value);
    setSelectedMonth(nextMonth);
    setSelectedDateKey(dateKey(new Date(selectedYear, nextMonth, 1)));
  }

  function selectYear(value: string) {
    const nextYear = Number(value);
    setSelectedYear(nextYear);
    setSelectedDateKey(dateKey(new Date(nextYear, selectedMonth, 1)));
  }

  return (
    <article className="card span-2 pnl-calendar" id="calendar">
      <div className="card-heading calendar-heading">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2>Monthly P/L</h2>
        </div>
        <div className="calendar-controls" aria-label="Calendar controls">
          <button
            aria-label="Previous month"
            className="icon-button"
            onClick={() => moveMonth(-1)}
            type="button"
          >
            &lt;
          </button>
          <label>
            <span>Month</span>
            <select
              aria-label="Month"
              onChange={(event) => selectMonth(event.target.value)}
              value={selectedMonth}
            >
              {monthNames.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Year</span>
            <select
              aria-label="Year"
              onChange={(event) => selectYear(event.target.value)}
              value={selectedYear}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label="Next month"
            className="icon-button"
            onClick={() => moveMonth(1)}
            type="button"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="calendar-summary" aria-label="Selected month totals">
        <div>
          <span>Realized P/L</span>
          <strong className={calendar.monthPnl >= 0 ? "positive" : "negative"}>
            {money(calendar.monthPnl)}
          </strong>
        </div>
        <div>
          <span>Closed Trades</span>
          <strong>{calendar.tradeCount}</strong>
        </div>
      </div>

      {calendar.tradeCount === 0 ? (
        <div className="calendar-empty" role="status">
          <strong>
            No closed trades in {monthNames[selectedMonth]} {selectedYear}
          </strong>
          <span>Realized P/L will appear here once trades are closed for this month.</span>
        </div>
      ) : null}

      <div className="calendar-layout">
        <div className="calendar-grid" aria-label={`${monthNames[selectedMonth]} ${selectedYear}`}>
          {weekdayLabels.map((weekday) => (
            <div className="weekday" key={weekday}>
              {weekday}
            </div>
          ))}
          {calendar.days.map((day) => (
            <button
              aria-pressed={day.dateKey === selectedDay?.dateKey}
              className={`calendar-day${day.inMonth ? "" : " calendar-day-muted"}${dayTone(day)}`}
              data-date-key={day.dateKey}
              key={day.dateKey}
              onClick={() => setSelectedDateKey(day.dateKey)}
              type="button"
            >
              <span>{day.date.getDate()}</span>
              {day.tradeCount > 0 ? (
                <strong className={day.pnl >= 0 ? "positive" : "negative"}>{money(day.pnl)}</strong>
              ) : (
                <strong className="calendar-no-pnl">-</strong>
              )}
              <em>
                <span className="trade-count-full">
                  {day.tradeCount} {day.tradeCount === 1 ? "trade" : "trades"}
                </span>
                <span className="trade-count-short">{day.tradeCount}t</span>
              </em>
            </button>
          ))}
        </div>

        <aside className="day-detail" aria-label="Selected day trades">
          <div>
            <p className="eyebrow">Selected Day</p>
            <h3>{selectedDay ? dayLabel(selectedDay.date) : "No day selected"}</h3>
          </div>
          {selectedDay && selectedDay.tradeCount > 0 ? (
            <>
              <div className="day-detail-total">
                <span>Realized P/L</span>
                <strong className={selectedDay.pnl >= 0 ? "positive" : "negative"}>
                  {money(selectedDay.pnl)}
                </strong>
              </div>
              <div className="stack-list compact-trades">
                {selectedDay.trades.map((trade) => (
                  <article className="list-row" key={trade.id}>
                    <div>
                      <strong>{trade.symbol}</strong>
                      <span>
                        {trade.side} x {trade.quantity}
                      </span>
                    </div>
                    <span
                      className={
                        trade.returnAmount !== null && trade.returnAmount >= 0
                          ? "positive"
                          : "negative"
                      }
                    >
                      {detailMoney(trade.returnAmount)}
                    </span>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-detail">No closed trades on this day.</p>
          )}
        </aside>
      </div>
    </article>
  );
}
