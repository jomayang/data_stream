const cron = require("node-cron");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabaseUrl = "https://esgaekqgpyboghjhpwsk.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ2Fla3FncHlib2doamhwd3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzI3NTEwNDAsImV4cCI6MTk4ODMyNzA0MH0.fVkl55mCYAz2ZfmOpyFxY0bZKfJqvLpcz6cn2F7vHDY";

const supabase = createClient(supabaseUrl, supabaseKey);

// cron.schedule(
//   "1,4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49,52,55,58 * * * *",
//   async () => {

function changeTimeZone(date, timeZone) {
  if (typeof date === "string") {
    return new Date(
      new Date(date).toLocaleString("en-US", {
        timeZone,
      })
    );
  }

  return new Date(
    date.toLocaleString("en-US", {
      timeZone,
    })
  );
}

const start = async () => {
  console.log("running a task on schedule");
  try {
    // Retrieve parcels payment_status=not-ready&
    const parcelsResponse = await axios.get(
      `https://api.yalidine.app/v1/parcels/?order_by=date_last_status&page_size=50`,
      {
        headers: {
          "X-API-ID": "92129974643421801058",
          "X-API-TOKEN":
            "JyWPYR7SpCZlWMSO4rQKcqrPAzNwmftAMdv49z07EVtwlTU3aBVNaFF2GLes2uoH",
        },
      }
    );
    const parcels = parcelsResponse.data.data.map((parcel) => ({
      tracking: parcel.tracking,
      first_name: parcel.firstname,
      last_name: parcel.familyname,
      created_at: new Date(parcel.date_creation),
      date_last_status: new Date(parcel.date_last_status),
      phone: parcel.contact_phone,
      wilaya: parcel.to_wilaya_name,
      commune: parcel.to_commune_name,
      center: parcel.current_center_name,
      product: parcel.product_list,
      last_status: parcel.last_status,
      address: parcel.address,
      payment_status: parcel.payment_status,
      tracker_id: 16 /* +parcel.order_id.replace("order_", "") */,
      is_stopdesk: parcel.is_stopdesk,
      price: parcel.price,
      delivery_fee: parcel.delivery_fee,
    }));

    // Extract tracking numbers
    const trackings = parcels.map((parcel) => parcel.tracking);
    const trackingsStr = trackings.join(",");
    console.log(trackingsStr);
    const historiesResponse = await axios.get(
      `https://api.yalidine.app/v1/histories/?tracking=${trackingsStr}&page_size=1000`,
      {
        headers: {
          "X-API-ID": "92129974643421801058",
          "X-API-TOKEN":
            "JyWPYR7SpCZlWMSO4rQKcqrPAzNwmftAMdv49z07EVtwlTU3aBVNaFF2GLes2uoH",
        },
      }
    );
    // console.log(historiesResponse.data.data);
    const histories = historiesResponse.data.data.map((history) => ({
      tracking: history.tracking,
      created_at: history.date_status,
      status: history.status,
      reason: history.reason,
      center_name: history.center_name,
      wilaya_name: history.wilaya_name,
      commune_name: history.commune_name,
    }));

    const keys = ["created_at", "tracking"];
    const filteredHistories = histories.filter(
      (
        (s) => (o) =>
          ((k) => !s.has(k) && s.add(k))(keys.map((k) => o[k]).join("|"))
      )(new Set())
    );
    let dataf = JSON.stringify(filteredHistories);
    fs.writeFileSync("histories.json", dataf);
    const { data, error } = await supabase
      .from("parcels")
      .upsert(parcels)
      .select();

    if (data) {
      console.log("success");
    }

    if (error) {
      console.log(error);
    }

    const { data: dataHistories, error: errorHistories } = await supabase
      .from("histories")
      .upsert(filteredHistories)
      .select();

    if (dataHistories) {
      console.log("histories upserted");
    }

    if (errorHistories) {
      console.log(errorHistories);
    }
  } catch (error) {
    console.log(error);
  }
};

start();
