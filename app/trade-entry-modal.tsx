"use client";

import { FormEvent, useId, useState } from "react";

export function TradeEntryModal() {
  const titleId = useId();
  const [open, setOpen] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpen(false);
  }

  return (
    <>
      <button className="primary-button" onClick={() => setOpen(true)} type="button">
        New Trade
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="modal-panel"
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Entry</p>
                <h2 id={titleId}>New Trade</h2>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={() => setOpen(false)}
                type="button"
              >
                x
              </button>
            </div>

            <form className="entry-form" onSubmit={submit}>
              <label>
                Symbol
                <input name="symbol" placeholder="AAPL" required />
              </label>
              <label>
                Side
                <select defaultValue="LONG" name="side">
                  <option>LONG</option>
                  <option>SHORT</option>
                </select>
              </label>
              <label>
                Quantity
                <input min="1" name="quantity" type="number" />
              </label>
              <label>
                Setup
                <input name="setup" placeholder="Opening range breakout" />
              </label>
              <label className="span-full">
                Notes
                <textarea name="notes" rows={4} />
              </label>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Save Draft
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
