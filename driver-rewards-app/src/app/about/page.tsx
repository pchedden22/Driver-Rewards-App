'use client'
import api_config from "@api/config.json";
import styles from "./template.module.css";
import React, { useEffect, useState } from 'react';

export default function About() {
    const [team_num, set_team_num] = useState("Loading...");
    const [product_name, set_product_name] = useState("Loading...");
    const [product_description, set_product_description] = useState("Loading...");
    const [version, set_version] = useState("Loading...");
    const [release_date, set_release_date] = useState("Loading...");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(api_config["url"] + "/about", {
                    method: 'GET',
                    mode: 'cors'
                });
        
                const data = await response.json();
                console.log(data);
                // Access the properties directly as they're not in DynamoDB format
                if (data) {
                    set_team_num(data.team_num.S || "Not available");
                    set_product_name(data.product_name.S || "Not available");
                    set_product_description(data.product_description.S || "Not available");
                    set_version(data.version.S || "Not available");
                    set_release_date(data.release_date.S || "Not available");
                } else {
                    throw new Error('Invalid data format received');
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                set_team_num("Error loading data");
                set_product_name("Error loading data");
                set_product_description("Error loading data");
                set_version("Error loading data");
                set_release_date("Error loading data");
            }
        };

        fetchData();
    }, []);

    return (
        <div>
            <header className={styles.header}>
                <h1>About Us</h1>
            </header>

            <div className={styles.background}>
                <div className={styles.about_container}>
                    <section id="about-section">
                        <h2 className={styles.h2}>Product Information</h2> <br />
                        <p><strong>Team Num:</strong> {team_num}</p>
                        <p><strong>Product Name:</strong> {product_name}</p>
                        <p><strong>Description:</strong> {product_description}</p>
                        <p><strong>Version:</strong> {version}</p>
                        <p><strong>Release Date:</strong> {release_date}</p>
                    </section>
                </div>
            </div>
        </div>
    );
}