// import styles from './apiTest.module.css';
'use client'
import api_config from "@api/config.json";
import React, { useEffect, useState } from 'react';


export default function APITest() {

    // Testing Get Drivers
    const [drivers_list_t1, set_drivers_list_t1] = useState(["Loading..."]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch((api_config["url"] + "/drivers"));
                const jsonResponse = await response.json();
                const body = jsonResponse

                set_drivers_list_t1(body.DriversList)
            } catch (error) {
                console.error('Failed to fetch data', error);
            }
        }
        fetchData()
            .catch(console.error);
    }, []);

    // Testing Get Drivers with a sponsor ID set
    const [drivers_list_t2, set_drivers_list_t2] = useState(["Loading..."]);
    const [sponsor_id_t2, set_sponsor_id_t2] = useState("Loading...");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch((api_config["url"] + "/drivers" + "?sponsorID=1728585709657"), {mode:'cors'});
                const jsonResponse = await response.json();
                const body = jsonResponse

                set_drivers_list_t2(body.DriversList)
                set_sponsor_id_t2(body.sponsorID)
                
                
            } catch (error) {
                console.error('Failed to fetch data', error);
            }

        }
        fetchData()
            .catch(console.error);
    }, []);
    
    return (
        <div className="apitest-body">
            <div>Test GET api/drivers</div>

            <div>
                {drivers_list_t1.toString()}
            </div>

            <br />
            <br />
            <br />

            <div>Test GET api/drivers?sponsorID=1728585709657</div>

            <div>
                {drivers_list_t2.toString()}
                <br />
                {sponsor_id_t2.toString()}
            </div>
        </div>
    );
  }
  
  
  
  
  