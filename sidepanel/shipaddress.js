const ShipAddressModule = {
    firstNames: ['Jo', 'John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Tom', 'Amy', 'Robert', 'Maria', 'James', 'Linda'],
    lastNames: ['Hultquist', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson'],

    usStreetNames: ['E Francis Ave', 'N Main St', 'W Oak Blvd', 'S Park Dr', 'E Maple Ln', 'N Elm St', 'W Pine Ave', 'S Cedar Rd', 'E Birch Way', 'N Spruce Ct'],
    usCities: ['La Habra', 'Los Angeles', 'New York', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas'],
    usStates: ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'],
    usZipPrefixes: [90631, 10001, 77001, 33101, 60601, 19101, 44101, 30301, 28201, 48201],

    caStreetNames: ['Yonge St', 'Bay St', 'Queen St', 'King St', 'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Blvd', 'Pine Rd', 'Elm St'],
    caCities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener'],
    caProvinces: ['ON', 'BC', 'QC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'],
    caPostalPrefixes: ['M5H', 'V6B', 'H3A', 'T2P', 'K1A', 'T5J', 'R3B', 'G1A', 'L8L', 'N2G'],

    ukStreetNames: ['High St', 'Church Rd', 'London Rd', 'Park Ave', 'Main St', 'Queen St', 'King St', 'Victoria Rd', 'Mill Ln', 'Oak Dr'],
    ukCities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Edinburgh', 'Bristol', 'Sheffield', 'Cardiff'],
    ukCounties: ['Greater London', 'Greater Manchester', 'West Midlands', 'West Yorkshire', 'Scotland', 'Merseyside', 'Lothian', 'South West England', 'South Yorkshire', 'Wales'],
    ukPostcodes: ['SW1A 1AA', 'M1 1AA', 'B1 1AA', 'LS1 1AA', 'G1 1AA', 'L1 1AA', 'EH1 1AA', 'BS1 1AA', 'S1 1AA', 'CF1 1AA'],

    auStreetNames: ['Collins St', 'George St', 'Bourke St', 'Flinders St', 'King St', 'Elizabeth St', 'Swanston St', 'Queen St', 'William St', 'Pitt St'],
    auCities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra', 'Sunshine Coast', 'Wollongong'],
    auStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
    auPostcodes: [2000, 3000, 4000, 6000, 5000, 7000, 800, 2600],

    init() {
        document.getElementById('btn-refresh-addresses')?.addEventListener('click', () => {
            this.generateAddresses();
        });
    },

    onShow() {
        this.generateAddresses();
    },

    pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    generateAddress(country) {
        const firstName = this.pick(this.firstNames);
        const lastName = this.pick(this.lastNames);
        const streetNumber = Math.floor(Math.random() * 9999) + 1;

        let streetName;
        let city;
        let state;
        let zip;
        let countryName;

        switch (country) {
            case 'US':
                streetName = this.pick(this.usStreetNames);
                city = this.pick(this.usCities);
                state = this.pick(this.usStates);
                zip = `${this.pick(this.usZipPrefixes)}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
                countryName = 'United States';
                break;
            case 'CA':
                streetName = this.pick(this.caStreetNames);
                city = this.pick(this.caCities);
                state = this.pick(this.caProvinces);
                zip = `${this.pick(this.caPostalPrefixes)} ${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`;
                countryName = 'Canada';
                break;
            case 'UK':
                streetName = this.pick(this.ukStreetNames);
                city = this.pick(this.ukCities);
                state = this.pick(this.ukCounties);
                zip = this.pick(this.ukPostcodes);
                countryName = 'United Kingdom';
                break;
            case 'AU':
                streetName = this.pick(this.auStreetNames);
                city = this.pick(this.auCities);
                state = this.pick(this.auStates);
                zip = this.pick(this.auPostcodes).toString();
                countryName = 'Australia';
                break;
            default:
                return null;
        }

        return {
            name: `${firstName} ${lastName}`,
            street: `${streetNumber} ${streetName}`,
            cityStateZip: `${city}, ${state}  ${zip}`,
            country: countryName
        };
    },

    generateAddresses() {
        const listEl = document.getElementById('address-list');
        if (!listEl) return;

        listEl.innerHTML = '<div class="address-loading">正在生成地址...</div>';

        setTimeout(() => {
            const countries = ['US', 'CA', 'UK', 'AU'];
            listEl.innerHTML = '';

            countries.forEach((country) => {
                const address = this.generateAddress(country);
                if (!address) return;

                const card = document.createElement('div');
                card.className = 'address-card';
                card.innerHTML = `
                    <div class="address-country">${address.country}</div>
                    <div class="address-body">${address.name}
${address.street}
${address.cityStateZip}</div>
                `;
                card.addEventListener('click', () => {
                    const text = `${address.name}\n${address.street}\n${address.cityStateZip}\n${address.country}`;
                    navigator.clipboard.writeText(text).then(() => {
                        card.classList.add('copied');
                        setTimeout(() => card.classList.remove('copied'), 1200);
                    });
                });
                card.title = '点击复制地址';
                listEl.appendChild(card);
            });
        }, 300);
    }
};
