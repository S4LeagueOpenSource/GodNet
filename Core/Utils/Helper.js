var EDamageType = require('../Constants/EDamageType')

// Define allowed Weapons here
var weapons = [
	{ category: 2, subCategory: 0, itemID: 1, productID: 1, name: 'Plasma Sword', type: '' },
	{ category: 2, subCategory: 0, itemID: 1102, productID: 2, name: 'Plasma Sword', type: 'A' },
	{ category: 2, subCategory: 0, itemID: 1103, productID: 2, name: 'Plasma Sword', type: 'B' },
	//{ category: 2, subCategory: 0, itemID: 1104, productID: 2, name: 'Plasma Sword', type: 'C' },
	//{ category: 2, subCategory: 0, itemID: 1105, productID: 2, name: 'Plasma Sword', type: 'D' },
	//{ category: 2, subCategory: 0, itemID: 1106, productID: 2, name: 'Plasma Sword', type: 'E' },
	//{ category: 2, subCategory: 0, itemID: 1107, productID: 2, name: 'Plasma Sword', type: 'F' },
	{ category: 2, subCategory: 0, itemID: 2, productID: 1, name: 'Counter Sword', type: '' },
	{ category: 2, subCategory: 0, itemID: 1109, productID: 2, name: 'Counter Sword', type: 'A' },
	{ category: 2, subCategory: 0, itemID: 1110, productID: 2, name: 'Counter Sword', type: 'B' },
	{ category: 2, subCategory: 0, itemID: 3, productID: 1, name: 'Storm Bat', type: '' },
	{ category: 2, subCategory: 0, itemID: 1111, productID: 2, name: 'Storm Bat', type: 'A' },
	{ category: 2, subCategory: 0, itemID: 1113, productID: 2, name: 'Storm Bat', type: 'B' },
	//{ category: 2, subCategory: 0, itemID: 1114, productID: 2, name: 'Storm Bat', type: 'C' },
	//{ category: 2, subCategory: 0, itemID: 4, productID: 1, name: 'Katana', type: '' },
	{ category: 2, subCategory: 1, itemID: 1, productID: 1, name: 'Submachine Gun', type: '' },
	{ category: 2, subCategory: 1, itemID: 1102, productID: 2, name: 'Submachine Gun', type: 'A' },
	{ category: 2, subCategory: 1, itemID: 1103, productID: 2, name: 'Submachine Gun', type: 'B' },
	//{ category: 2, subCategory: 1, itemID: 1104, productID: 2, name: 'Submachine Gun', type: 'C' },
	{ category: 2, subCategory: 1, itemID: 2, productID: 1, name: 'Revolver', type: '' },
	{ category: 2, subCategory: 1, itemID: 1106, productID: 2, name: 'Revolver', type: 'A' },
	{ category: 2, subCategory: 1, itemID: 1107, productID: 2, name: 'Revolver', type: 'B' },
	{ category: 2, subCategory: 1, itemID: 4, productID: 1, name: 'Semi Rifle', type: '' },
	{ category: 2, subCategory: 1, itemID: 1109, productID: 2, name: 'Semi Rifle', type: 'A' },
	{ category: 2, subCategory: 1, itemID: 1110, productID: 2, name: 'Semi Rifle', type: 'B' },
	//{ category: 2, subCategory: 1, itemID: 5, productID: 1, name: 'Card Gun', type: '' },
	{ category: 2, subCategory: 1, itemID: 6, productID: 1, name: 'Smash Rifle', type: '' },
	{ category: 2, subCategory: 1, itemID: 7, productID: 1, name: 'Hand Gun', type: '' },
	{ category: 2, subCategory: 2, itemID: 1, productID: 1, name: 'Heavy Machine Gun', type: '' },
	{ category: 2, subCategory: 2, itemID: 1102, productID: 2, name: 'Heavy Machine Gun', type: 'A' },
	{ category: 2, subCategory: 2, itemID: 1103, productID: 2, name: 'Heavy Machine Gun', type: 'B' },
	//{ category: 2, subCategory: 2, itemID: 1104, productID: 2, name: 'Heavy Machine Gun', type: 'C' },
	{ category: 2, subCategory: 2, itemID: 2, productID: 1, name: 'Gauss Rifle', type: '' },
	{ category: 2, subCategory: 2, itemID: 1114, productID: 2, name: 'Gauss Rifle', type: 'A' },
	{ category: 2, subCategory: 2, itemID: 1115, productID: 2, name: 'Gauss Rifle', type: 'B' },
	{ category: 2, subCategory: 2, itemID: 1116, productID: 2, name: 'Gauss Rifle', type: 'C' },
	{ category: 2, subCategory: 3, itemID: 1, productID: 1, name: 'Rail Gun', type: '' },
	{ category: 2, subCategory: 3, itemID: 1102, productID: 2, name: 'Rail Gun', type: 'A' },
	{ category: 2, subCategory: 3, itemID: 1103, productID: 2, name: 'Rail Gun', type: 'B' },
	{ category: 2, subCategory: 3, itemID: 2, productID: 1, name: 'Cannonade', type: '' },
	{ category: 2, subCategory: 3, itemID: 1105, productID: 2, name: 'Cannonade', type: 'A' },
	{ category: 2, subCategory: 3, itemID: 1106, productID: 2, name: 'Cannonade', type: 'B' },
	{ category: 2, subCategory: 4, itemID: 1, productID: 1, name: 'Sentry Gun', type: '' },
	//{ category: 2, subCategory: 4, itemID: 2, productID: 1, name: 'Sentiforce', type: '' },
	{ category: 2, subCategory: 4, itemID: 1102, productID: 2, name: 'Sentry Gun', type: 'A' },
	{ category: 2, subCategory: 4, itemID: 1103, productID: 2, name: 'Sentry Gun', type: 'B' },
	//{ category: 2, subCategory: 4, itemID: 1104, productID: 2, name: 'Sentry Gun', type: 'C' },
	{ category: 2, subCategory: 4, itemID: 3, productID: 1, name: 'Senty Nell', type: '' },
	//{ category: 2, subCategory: 5, itemID: 1, productID: 1, name: 'Mine Gun', type: '' },
	{ category: 2, subCategory: 6, itemID: 1, productID: 1, name: 'Mind Energy', type: '' },
	{ category: 2, subCategory: 6, itemID: 1102, productID: 2, name: 'Mind Energy', type: 'A' },
	{ category: 2, subCategory: 6, itemID: 1103, productID: 2, name: 'Mind Energy', type: 'B' },
	{ category: 2, subCategory: 6, itemID: 2, productID: 1, name: 'Mind Shock', type: '' },
	{ category: 2, subCategory: 6, itemID: 1105, productID: 2, name: 'Mind Shock', type: 'A' },
	{ category: 2, subCategory: 6, itemID: 1106, productID: 2, name: 'Mind Shock', type: 'B' }
]

module.exports = {
	calculateCombiLevel: function(points) {
		var result = {}

		if(points >= 0 && points < 10) {
			result.level = 0
			result.levelPoints = points
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 10 && points < 20) {
			result.level = 1
			result.levelPoints = points - 10
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 20 && points < 30) {
			result.level = 2
			result.levelPoints = points - 20
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 30 && points < 40) {
			result.level = 3
			result.levelPoints = points - 30
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 40 && points < 50) {
			result.level = 4
			result.levelPoints = points - 40
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 50 && points < 60) {
			result.level = 5
			result.levelPoints = points - 50
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 60 && points < 70) {
			result.level = 6
			result.levelPoints = points - 60
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 70 && points < 80) {
			result.level = 7
			result.levelPoints = points - 70
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 80 && points < 90) {
			result.level = 8
			result.levelPoints = points - 80
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 90 && points < 100) {
			result.level = 9
			result.levelPoints = points - 90
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 100 && points < 110) {
			result.level = 10
			result.levelPoints = points - 100
			result.levelbar = result.levelPoints + ':10'
		} else if(points >= 110 && points < 130) {
			result.level = 11
			result.levelPoints = points - 110
			result.levelbar = result.levelPoints + ':20'
		} else if(points >= 130 && points < 150) {
			result.level = 12
			result.levelPoints = points - 130
			result.levelbar = result.levelPoints + ':20'
		} else if(points >= 150 && points < 170) {
			result.level = 13
			result.levelPoints = points - 150
			result.levelbar = result.levelPoints + ':20'
		} else if(points >= 170 && points < 190) {
			result.level = 14
			result.levelPoints = points - 170
			result.levelbar = result.levelPoints + ':20'
		} else if(points >= 190 && points < 210) {
			result.level = 15
			result.levelPoints = points - 190
			result.levelbar = result.levelPoints + ':20'
		} else if(points >= 210 && points < 230) {
			result.level = 16
			result.levelPoints = points - 210
			result.levelbar = result.levelPoints + ':20'
		} else if(points >= 230 && points < 250) {
			result.level = 17
			result.levelPoints = points - 230
			result.levelbar = result.levelPoints + ':20'
		} else if(points >= 250 && points < 270) {
			result.level = 18
			result.levelPoints = points - 250
			result.levelbar = result.levelPoints + ':20'
		} else if(points >= 270 && points < 290) {
			result.level = 19
			result.levelPoints = points - 270
			result.levelbar = result.levelPoints + ':20'
		} else if(points >= 290 && points < 310) {
			result.level = 20
			result.levelPoints = points - 290
			result.levelbar = result.levelPoints + ':20'
		} else if(points >= 310 && points < 350) {
			result.level = 21
			result.levelPoints = points - 310
			result.levelbar = result.levelPoints + ':40'
		} else if(points >= 350 && points < 390) {
			result.level = 22
			result.levelPoints = points - 350
			result.levelbar = result.levelPoints + ':40'
		} else if(points >= 390 && points < 430) {
			result.level = 23
			result.levelPoints = points - 390
			result.levelbar = result.levelPoints + ':40'
		} else if(points >= 430 && points < 470) {
			result.level = 24
			result.levelPoints = points - 430
			result.levelbar = result.levelPoints + ':40'
		} else if(points >= 470 && points < 510) {
			result.level = 25
			result.levelPoints = points - 470
			result.levelbar = result.levelPoints + ':40'
		} else if(points >= 510 && points < 550) {
			result.level = 26
			result.levelPoints = points - 510
			result.levelbar = result.levelPoints + ':40'
		} else if(points >= 550 && points < 590) {
			result.level = 27
			result.levelPoints = points - 550
			result.levelbar = result.levelPoints + ':40'
		} else if(points >= 590 && points < 630) {
			result.level = 28
			result.levelPoints = points - 590
			result.levelbar = result.levelPoints + ':40'
		} else if(points >= 630 && points < 670) {
			result.level = 29
			result.levelPoints = points - 630
			result.levelbar = result.levelPoints + ':40'
		} else if(points >= 670 && points < 710) {
			result.level = 30
			result.levelPoints = points - 670
			result.levelbar = result.levelPoints + ':40'
		} else if(points >= 710 && points < 790) {
			result.level = 31
			result.levelPoints = points - 710
			result.levelbar = result.levelPoints + ':80'
		} else if(points >= 790 && points < 870) {
			result.level = 32
			result.levelPoints = points - 790
			result.levelbar = result.levelPoints + ':80'
		} else if(points >= 870 && points < 950) {
			result.level = 33
			result.levelPoints = points - 870
			result.levelbar = result.levelPoints + ':80'
		} else if(points >= 950 && points < 1030) {
			result.level = 34
			result.levelPoints = points - 950
			result.levelbar = result.levelPoints + ':80'
		} else if(points >= 1030 && points < 1110) {
			result.level = 35
			result.levelPoints = points - 1030
			result.levelbar = result.levelPoints + ':80'
		} else if(points >= 1110 && points < 1190) {
			result.level = 36
			result.levelPoints = points - 1110
			result.levelbar = result.levelPoints + ':80'
		} else if(points >= 1190 && points < 1270) {
			result.level = 37
			result.levelPoints = points - 1190
			result.levelbar = result.levelPoints + ':80'
		} else if(points >= 1270 && points < 1350) {
			result.level = 38
			result.levelPoints = points - 1270
			result.levelbar = result.levelPoints + ':80'
		} else if(points >= 1350 && points < 1430) {
			result.level = 39
			result.levelPoints = points - 1350
			result.levelbar = result.levelPoints + ':80'
		} else if(points >= 1430 && points < 1510) {
			result.level = 40
			result.levelPoints = points - 1430
			result.levelbar = result.levelPoints + ':80'
		} else if(points >= 1510 && points < 1670) {
			result.level = 41
			result.levelPoints = points - 1510
			result.levelbar = result.levelPoints + ':160'
		} else if(points >= 1670 && points < 1830) {
			result.level = 42
			result.levelPoints = points - 1670
			result.levelbar = result.levelPoints + ':160'
		} else if(points >= 1830 && points < 1990) {
			result.level = 43
			result.levelPoints = points - 1830
			result.levelbar = result.levelPoints + ':160'
		} else if(points >= 1990 && points < 2150) {
			result.level = 44
			result.levelPoints = points - 1990
			result.levelbar = result.levelPoints + ':160'
		} else if(points >= 2150 && points < 2310) {
			result.level = 45
			result.levelPoints = points - 2150
			result.levelbar = result.levelPoints + ':160'
		} else if(points >= 2310 && points < 2470) {
			result.level = 46
			result.levelPoints = points - 2310
			result.levelbar = result.levelPoints + ':160'
		} else if(points >= 2470 && points < 2630) {
			result.level = 47
			result.levelPoints = points - 2470
			result.levelbar = result.levelPoints + ':160'
		} else if(points >= 2630 && points < 2790) {
			result.level = 48
			result.levelPoints = points - 2630
			result.levelbar = result.levelPoints + ':160'
		} else if(points >= 2790 && points < 2950) {
			result.level = 49
			result.levelPoints = points - 2790
			result.levelbar = result.levelPoints + ':160'
		} else if(points >= 2950 && points < 3110) {
			result.level = 50
			result.levelPoints = points - 2950
			result.levelbar = result.levelPoints + ':160'
		} else if (points >= 3110) {
			result.level = 50
			result.levelEXP = 160
			result.levelbar = '160:160'
		}

		return result
	},
	calculateLevel: function(exp) {
		var result = {}

	    if (exp >= 0 && exp < 1400) {
	        result.level = 0
	    	result.levelEXP = exp
	        result.levelbar = result.levelEXP + ':1400'
	    } else if (exp >= 1400 && exp < 3000) {
	        result.level = 1
	    	result.levelEXP = exp - 1400
	        result.levelbar = result.levelEXP + ':1600'
	    } else if (exp >= 3000 && exp < 4800) {
	        result.level = 2
	    	result.levelEXP = exp - 3000
	        result.levelbar = result.levelEXP + ':1800'
	    } else if (exp >= 4800 && exp < 6800) {
	        result.level = 3
	    	result.levelEXP = exp - 4800
	        result.levelbar = result.levelEXP + ':2000'
	    } else if (exp >= 6800 && exp < 9000) {
	        result.level = 4
	    	result.levelEXP = exp - 6800
	        result.levelbar = result.levelEXP + ':2200'
	    } else if (exp >= 9000 && exp < 11400) {
	        result.level = 5
	    	result.levelEXP = exp - 9000
	        result.levelbar = result.levelEXP + ':2400'
	    } else if (exp >= 11400 && exp < 14200) {
	        result.level = 6
	    	result.levelEXP = exp - 11400
	        result.levelbar = result.levelEXP + ':2800'
	    } else if (exp >= 14200 && exp < 17400) {
	        result.level = 7
	    	result.levelEXP = exp - 14200
	        result.levelbar = result.levelEXP + ':3200'
	    } else if (exp >= 17400 && exp < 21000) {
	        result.level = 8
	    	result.levelEXP = exp - 17400
	        result.levelbar = result.levelEXP + ':3600'
	    } else if (exp >= 21000 && exp < 25000) {
	        result.level = 9
	    	result.levelEXP = exp - 21000
	        result.levelbar = result.levelEXP + ':4000'
	    } else if (exp >= 25000 && exp < 29400) {
	        result.level = 10
	    	result.levelEXP = exp - 25000
	        result.levelbar = result.levelEXP + ':4400'
	    } else if (exp >= 29400 && exp < 34800) {
	        result.level = 11
	    	result.levelEXP = exp - 29400
	        result.levelbar = result.levelEXP + ':5400'
	    } else if (exp >= 34800 && exp < 41200) {
	        result.level = 12
	    	result.levelEXP = exp - 34800
	        result.levelbar = result.levelEXP + ':6400'
	    } else if (exp >= 41200 && exp < 48600) {
	        result.level = 13
	    	result.levelEXP = exp - 41200
	        result.levelbar = result.levelEXP + ':7400'
	    } else if (exp >= 48600 && exp < 57000) {
	        result.level = 14
	    	result.levelEXP = exp - 48600
	        result.levelbar = result.levelEXP + ':8400'
	    } else if (exp >= 57000 && exp < 66400) {
	        result.level = 15
	    	result.levelEXP = exp - 57000
	        result.levelbar = result.levelEXP + ':9400'
	    } else if (exp >= 66400 && exp < 77400) {
	        result.level = 16
	    	result.levelEXP = exp - 66400
	        result.levelbar = result.levelEXP + ':11000'
	    } else if (exp >= 77400 && exp < 90400) {
	        result.level = 17
	    	result.levelEXP = exp - 77400
	        result.levelbar = result.levelEXP + ':13000'
	    } else if (exp >= 90400 && exp < 105400) {
	        result.level = 18
	    	result.levelEXP = exp - 90400
	        result.levelbar = result.levelEXP + ':15000'
	    } else if (exp >= 105400 && exp < 122400) {
	        result.level = 19
	    	result.levelEXP = exp - 105400
	        result.levelbar = result.levelEXP + ':17000'
	    } else if (exp >= 122400 && exp < 141400) {
	        result.level = 20
	    	result.levelEXP = exp - 122400
	        result.levelbar = result.levelEXP + ':19000'
	    } else if (exp >= 141400 && exp < 164400) {
	        result.level = 21
	    	result.levelEXP = exp - 141400
	        result.levelbar = result.levelEXP + ':23000'
	    } else if (exp >= 164400 && exp < 191400) {
	        result.level = 22
	    	result.levelEXP = exp - 164400
	        result.levelbar = result.levelEXP + ':27000'
	    } else if (exp >= 191400 && exp < 222400) {
	        result.level = 23
	    	result.levelEXP = exp - 191400
	        result.levelbar = result.levelEXP + ':31000'
	    } else if (exp >= 222400 && exp < 257400) {
	        result.level = 24
	    	result.levelEXP = exp - 222400
	        result.levelbar = result.levelEXP + ':35000'
	    } else if (exp >= 257400 && exp < 296400) {
	        result.level = 25
	    	result.levelEXP = exp - 257400
	        result.levelbar = result.levelEXP + ':39000'
	    } else if (exp >= 296400 && exp < 341400) {
	        result.level = 26
	    	result.levelEXP = exp - 296400
	        result.levelbar = result.levelEXP + ':45000'
	    } else if (exp >= 341400 && exp < 391400) {
	        result.level = 27
	    	result.levelEXP = exp - 341400
	        result.levelbar = result.levelEXP + ':50000'
	    } else if (exp >= 391400 && exp < 446400) {
	        result.level = 28
	    	result.levelEXP = exp - 391400
	        result.levelbar = result.levelEXP + ':55000'
	    } else if (exp >= 446400 && exp < 506400) {
	        result.level = 29
	    	result.levelEXP = exp - 446400
	        result.levelbar = result.levelEXP + ':60000'
	    } else if (exp >= 506400 && exp < 571400) {
	        result.level = 30
	    	result.levelEXP = exp - 506400
	        result.levelbar = result.levelEXP + ':65000'
	    } else if (exp >= 571400 && exp < 645220) {
	        result.level = 31
	    	result.levelEXP = exp - 571400
	        result.levelbar = result.levelEXP + ':73820'
	    } else if (exp >= 645220 && exp < 727860) {
	        result.level = 32
	    	result.levelEXP = exp - 645220
	        result.levelbar = result.levelEXP + ':82640'
	    } else if (exp >= 727860 && exp < 819320) {
	        result.level = 33
	    	result.levelEXP = exp - 727860
	        result.levelbar = result.levelEXP + ':91460'
	    } else if (exp >= 819320 && exp < 919600) {
	        result.level = 34
	    	result.levelEXP = exp - 819320
	        result.levelbar = result.levelEXP + ':100280'
	    } else if (exp >= 919600 && exp < 1028700) {
	        result.level = 35
	    	result.levelEXP = exp - 919600
	        result.levelbar = result.levelEXP + ':109100'
	    } else if (exp >= 1028700 && exp < 1149320) {
	        result.level = 36
	    	result.levelEXP = exp - 1028700
	        result.levelbar = result.levelEXP + ':120620'
	    } else if (exp >= 1149320 && exp < 1281460) {
	        result.level = 37
	    	result.levelEXP = exp - 1149320
	        result.levelbar = result.levelEXP + ':132140'
	    } else if (exp >= 1281460 && exp < 1425120) {
	        result.level = 38
	    	result.levelEXP = exp - 1281460
	        result.levelbar = result.levelEXP + ':143660'
	    } else if (exp >= 1425120 && exp < 1580300) {
	        result.level = 39
	    	result.levelEXP = exp - 1425120
	        result.levelbar = result.levelEXP + ':155180'
	    } else if (exp >= 1580300 && exp < 1747000) {
	        result.level = 40
	    	result.levelEXP = exp - 1580300
	        result.levelbar = result.levelEXP + ':166700'
	    } else if (exp >= 1747000 && exp < 1928280) {
	        result.level = 41
	    	result.levelEXP = exp - 1747000
	        result.levelbar = result.levelEXP + ':181280'
	    } else if (exp >= 1928280 && exp < 2124140) {
	        result.level = 42
	    	result.levelEXP = exp - 1928280
	        result.levelbar = result.levelEXP + ':195860'
	    } else if (exp >= 2124140 && exp < 2334580) {
	        result.level = 43
	    	result.levelEXP = exp - 2124140
	        result.levelbar = result.levelEXP + ':210440'
	    } else if (exp >= 2334580 && exp < 2559600) {
	        result.level = 44
	    	result.levelEXP = exp - 2334580
	        result.levelbar = result.levelEXP + ':225020'
	    } else if (exp >= 2559600 && exp < 2799200) {
	        result.level = 45
	    	result.levelEXP = exp - 2559600
	        result.levelbar = result.levelEXP + ':239600'
	    } else if (exp >= 2799200 && exp < 3056800) {
	        result.level = 46
	    	result.levelEXP = exp - 2799200
	        result.levelbar = result.levelEXP + ':257600'
	    } else if (exp >= 3056800 && exp < 3332400) {
	        result.level = 47
	    	result.levelEXP = exp - 3056800
	        result.levelbar = result.levelEXP + ':275600'
	    } else if (exp >= 3332400 && exp < 3626000) {
	        result.level = 48
	    	result.levelEXP = exp - 3332400
	        result.levelbar = result.levelEXP + ':293600'
	    } else if (exp >= 3626000 && exp < 3937600) {
	        result.level = 49
	    	result.levelEXP = exp - 3626000
	        result.levelbar = result.levelEXP + ':311600'
	    } else if (exp >= 3937600 && exp < 4267200) {
	        result.level = 50
	    	result.levelEXP = exp - 3937600
	        result.levelbar = result.levelEXP + ':329600'
	    } else if (exp >= 4267200 && exp < 4618580) {
	        result.level = 51
	    	result.levelEXP = exp - 4267200
	        result.levelbar = result.levelEXP + ':351380'
	    } else if (exp >= 4618580 && exp < 4991740) {
	        result.level = 52
	    	result.levelEXP = exp - 4618580
	        result.levelbar = result.levelEXP + ':373160'
	    } else if (exp >= 4991740 && exp < 5386680) {
	        result.level = 53
	    	result.levelEXP = exp - 4991740
	        result.levelbar = result.levelEXP + ':394940'
	    } else if (exp >= 5386680 && exp < 5803400) {
	        result.level = 54
	    	result.levelEXP = exp - 5386680
	        result.levelbar = result.levelEXP + ':416720'
	    } else if (exp >= 5803400 && exp < 6241900) {
	        result.level = 55
	    	result.levelEXP = exp - 5803400
	        result.levelbar = result.levelEXP + ':438500'
	    } else if (exp >= 6241900 && exp < 6706320) {
	        result.level = 56
	    	result.levelEXP = exp - 6241900
	        result.levelbar = result.levelEXP + ':464420'
	    } else if (exp >= 6706320 && exp < 7196660) {
	        result.level = 57
	    	result.levelEXP = exp - 6706320
	        result.levelbar = result.levelEXP + ':490340'
	    } else if (exp >= 7196660 && exp < 7712920) {
	        result.level = 58
	    	result.levelEXP = exp - 7196660
	        result.levelbar = result.levelEXP + ':516260'
	    } else if (exp >= 7712920 && exp < 8255100) {
	        result.level = 59
	    	result.levelEXP = exp - 7712920
	        result.levelbar = result.levelEXP + ':542180'
	    } else if (exp >= 8255100 && exp < 8823200) {
	        result.level = 60
	    	result.levelEXP = exp - 8255100
	        result.levelbar = result.levelEXP + ':568100'
	    } else if (exp >= 8823200 && exp < 9421720) {
	        result.level = 61
	    	result.levelEXP = exp - 8823200
	        result.levelbar = result.levelEXP  + ':598520'
	    } else if (exp >= 9421720 && exp < 10050660) {
	        result.level = 62
	    	result.levelEXP = exp - 9421720
	        result.levelbar = result.levelEXP + ':628940'
	    } else if (exp >= 10050660 && exp < 10710020) {
	        result.level = 63
	    	result.levelEXP = exp - 10050660
	        result.levelbar = result.levelEXP + ':659360'
	    } else if (exp >= 10710020 && exp < 11399800) {
	        result.level = 64
	    	result.levelEXP = exp - 10710020
	        result.levelbar = result.levelEXP + ':689780'
	    } else if (exp >= 11399800 && exp < 12120000) {
	        result.level = 65
	    	result.levelEXP = exp - 11399800
	        result.levelbar = result.levelEXP + ':720200'
	    } else if (exp >= 12120000 && exp < 12875480) {
	        result.level = 66
	    	result.levelEXP = exp - 12120000
	        result.levelbar = result.levelEXP + ':755480'
	    } else if (exp >= 12875480 && exp < 13666240) {
	        result.level = 67
	    	result.levelEXP = exp - 12875480
	        result.levelbar = result.levelEXP + ':790760'
	    } else if (exp >= 13666240 && exp < 14492280) {
	        result.level = 68
	    	result.levelEXP = exp - 13666240
	        result.levelbar = result.levelEXP + ':826040'
	    } else if (exp >= 14492280 && exp < 15353600) {
	        result.level = 69
	    	result.levelEXP = exp - 14492280
	        result.levelbar = result.levelEXP + ':861320'
	    } else if (exp >= 15353600 && exp < 16250200) {
	        result.level = 70
	    	result.levelEXP = exp - 15353600
	        result.levelbar = result.levelEXP + ':896600'
	    } else if (exp >= 16250200 && exp < 17187300) {
	        result.level = 71
	    	result.levelEXP = exp - 16250200
	        result.levelbar = result.levelEXP + ':937100'
	    } else if (exp >= 17187300 && exp < 18164900) {
	        result.level = 72
	    	result.levelEXP = exp - 17187300
	        result.levelbar = result.levelEXP + ':977600'
	    } else if (exp >= 18164900 && exp < 19183000) {
	        result.level = 73
	    	result.levelEXP = exp - 18164900
	        result.levelbar = result.levelEXP + ':1018100'
	    } else if (exp >= 19183000 && exp < 20241600) {
	        result.level = 74
	    	result.levelEXP = exp - 19183000
	        result.levelbar = result.levelEXP + ':1058600'
	    } else if (exp >= 20241600 && exp < 21340700) {
	        result.level = 75
	    	result.levelEXP = exp - 20241600
	        result.levelbar = result.levelEXP + ':1099100'
	    } else if (exp >= 21340700 && exp < 22485880) {
	        result.level = 76
	    	result.levelEXP = exp - 21340700
	        result.levelbar = result.levelEXP + ':1145180'
	    } else if (exp >= 22485880 && exp < 23677140) {
	        result.level = 77
	    	result.levelEXP = exp - 22485880
	        result.levelbar = result.levelEXP + ':1191260'
	    } else if (exp >= 23677140 && exp < 24914480) {
	        result.level = 78
	    	result.levelEXP = exp - 23677140
	        result.levelbar = result.levelEXP + ':1237340'
	    } else if (exp >= 24914480 && exp < 26197900) {
	        result.level = 79
	    	result.levelEXP = exp - 24914480
	        result.levelbar = result.levelEXP + ':1283420'
	    } else if (exp >= 26197900 && exp < 27527400) {
	        result.level = 80
	    	result.levelEXP = exp - 26197900
	        result.levelbar = result.levelEXP + ':1329500'
	    } else if (exp >= 27527400 && exp < 28908920) {
	        result.level = 81
	    	result.levelEXP = exp - 27527400
	        result.levelbar = result.levelEXP + ':1381520'
	    } else if (exp >= 28908920 && exp < 30342460) {
	        result.level = 82
	    	result.levelEXP = exp - 28908920
	        result.levelbar = result.levelEXP + ':1433540'
	    } else if (exp >= 30342460 && exp < 31828020) {
	        result.level = 83
	    	result.levelEXP = exp - 30342460
	        result.levelbar = result.levelEXP + ':1485560'
	    } else if (exp >= 31828020 && exp < 33365600) {
	        result.level = 84
	    	result.levelEXP = exp - 31828020
	        result.levelbar = result.levelEXP + ':1537580'
	    } else if (exp >= 33365600 && exp < 34955200) {
	        result.level = 85
	    	result.levelEXP = exp - 33365600
	        result.levelbar = result.levelEXP + ':1589600'
	    } else if (exp >= 34955200 && exp < 36603120) {
	        result.level = 86
	    	result.levelEXP = exp - 34955200
	        result.levelbar = result.levelEXP + ':1647920'
	    } else if (exp >= 36603120 && exp < 38309360) {
	        result.level = 87
	    	result.levelEXP = exp - 36603120
	        result.levelbar = result.levelEXP + ':1706240'
	    } else if (exp >= 38309360 && exp < 40073920) {
	        result.level = 88
	    	result.levelEXP = exp - 38309360
	        result.levelbar = result.levelEXP + ':1764560'
	    } else if (exp >= 40073920 && exp < 41896800) {
	        result.level = 89
	    	result.levelEXP = exp - 40073920
	        result.levelbar = result.levelEXP  + ':1822880'
	    } else if (exp >= 41896800 && exp < 43778000) {
	        result.level = 90
	    	result.levelEXP = exp - 41896800
	        result.levelbar = result.levelEXP + ':1881200'
	    } else if (exp >= 43778000 && exp < 45724180) {
	        result.level = 91
	    	result.levelEXP = exp - 43778000
	        result.levelbar = result.levelEXP + ':1946180'
	    } else if (exp >= 45724180 && exp < 47725340) {
	        result.level = 92
	    	result.levelEXP = exp - 45724180
	        result.levelbar = result.levelEXP + ':2011160'
	    } else if (exp >= 47725340 && exp < 49811480) {
	        result.level = 93
	    	result.levelEXP = exp - 47725340
	        result.levelbar = result.levelEXP + ':2076140'
	    } else if (exp >= 49811480 && exp < 51952600) {
	        result.level = 94
	    	result.levelEXP = exp - 49811480
	        result.levelbar = result.levelEXP + ':2141120'
	    } else if (exp >= 51952600 && exp < 54158700) {
	        result.level = 95
	    	result.levelEXP = exp - 51952600
	        result.levelbar = result.levelEXP + ':2206100'
	    } else if (exp >= 54158700 && exp < 56436800) {
	        result.level = 96
	    	result.levelEXP = exp - 54158700
	        result.levelbar = result.levelEXP + ':2278100'
	    } else if (exp >= 56436800 && exp < 58786900) {
	        result.level = 97
	    	result.levelEXP = exp - 56436800
	        result.levelbar = result.levelEXP  + ':2350100'
	    } else if (exp >= 58786900 && exp < 61209000) {
	        result.level = 98
	    	result.levelEXP = exp - 58786900
	        result.levelbar = result.levelEXP + ':2422100'
	    } else if (exp >= 61209000 && exp < 63703100) {
	        result.level = 99
	    	result.levelEXP = exp - 61209000
	        result.levelbar = result.levelEXP  + ':2494100'
	    } else if (exp >= 63703100) {
	        result.level = 100
	    	result.levelEXP = 2494100
	        result.levelbar = result.levelEXP + ':2494100'
	    }

	    return result
	},
	getS4Color: function(r, g, b, a) {
		if(!a) {
			a = 255
		}

		return '{CB-' + r + ',' + g + ',' + b + ',' + a + '}'
	},
	getWeaponByDamageType: function(damageType) {
		var weapon = []

		switch (damageType) {
			case EDamageType.PS_LEFT:
				weapon = {
					name: 'Plasma Sword',
					attack: 'LIGHT'
				}
				break
			case EDamageType.PS_LEFT_SHORT:
				weapon = {
					name: 'Plasma Sword',
					attack: 'LIGHT'
				}
				break
			case EDamageType.PS_LEFT_LONG:
				weapon = {
					name: 'Plasma Sword',
					attack: 'CUT'
				}
				break
			case EDamageType.PS_RIGHT:
				weapon = {
					name: 'Plasma Sword',
					attack: 'DASH'
				}
				break
			case EDamageType.PS_RIGHT_FINAL:
				weapon = {
					name: 'Plasma Sword',
					attack: 'DASH_FINAL'
				}
				break
			case EDamageType.PS_JUMP_LEFT_CRIT:
				weapon = {
					name: 'Plasma Sword',
					attack: 'JUMP_LEFT_CRIT'
				}
				break
			case EDamageType.PS_JUMP_LEFT:
				weapon = {
					name: 'Plasma Sword',
					attack: 'STUN'
				}
				break
			case EDamageType.SMG_LEFT:
				weapon = {
					name: 'Submachine Gun',
					attack: 'SHOT'
				}
				break
			case EDamageType.HMG_LEFT:
				weapon = {
					name: 'Heavy Machine Gun',
					attack: 'SHOT'
				}
				break
			case EDamageType.HMG_LEFT_COMBO_1:
				weapon = {
					name: 'Heavy Machine Gun',
					attack: 'SHOT_COMBO_1'
				}
				break
			case EDamageType.HMG_LEFT_COMBO_2:
				weapon = {
					name: 'Heavy Machine Gun',
					attack: 'SHOT_COMBO_2'
				}
				break
			case EDamageType.RAIL_LEFT:
				weapon = {
					name: 'Rail Gun',
					attack: 'SHOT'
				}
				break
			case EDamageType.RAIL_LEFT_LONG:
				weapon = {
					name: 'Rail Gun',
					attack: 'SHOT_FULL'
				}
				break
			case EDamageType.MINE_GUN_LEFT:
				weapon = {
					name: 'Mine Gun',
					attack: 'LEFT'
				}
				break
			case EDamageType.MIND_ENERGY_LEFT:
				weapon = {
					name: 'Mind Energy',
					attack: 'LEFT'
				}
				break
			case EDamageType.SENTRY_GUN_ATK:
				weapon = {
					name: 'Sentry Gun',
					attack: 'ATK'
				}
				break
			case EDamageType.SENTIFORCE_ATK:
				weapon = {
					name: 'Sentiforce',
					attack: 'ATK'
				}
				break
			case EDamageType.SENTY_NELL_STUN:
				weapon = {
					name: 'Senty Nell',
					attack: 'ATK'
				}
				break
			case EDamageType.REVO_LEFT:
				weapon = {
					name: 'Revolver',
					attack: 'SHOT'
				}
				break
			case EDamageType.CANNO_LEFT:
				weapon = {
					name: 'Cannonade',
					attack: 'SHOT'
				}
				break
			case EDamageType.CANNO_LEFT_LONG:
				weapon = {
					name: 'Cannonade',
					attack: 'SHOT_FULL'
				}
				break
			case EDamageType.CS_LEFT_LONG_CRIT:
				weapon = {
					name: 'Counter Sword',
					attack: 'LEFT_LONG_CRIT'
				}
				break
			case EDamageType.CS_LEFT_LONG:
				weapon = {
					name: 'Counter Sword',
					attack: 'LEFT_LONG'
				}
				break
			case EDamageType.CS_LEFT:
				weapon = {
					name: 'Counter Sword',
					attack: 'LEFT'
				}
				break
			case EDamageType.CS_LEFT_COMBO_1:
				weapon = {
					name: 'Counter Sword',
					attack: 'LEFT_COMBO_1'
				}
				break
			case EDamageType.CS_LEFT_COMBO_2:
				weapon = {
					name: 'Counter Sword',
					attack: 'LEFT_COMBO_2'
				}
				break
			case EDamageType.CS_LEFT_COMBO_3:
				weapon = {
					name: 'Counter Sword',
					attack: 'LEFT_COMBO_3'
				}
				break
			case EDamageType.CS_LEFT_COMBO_4:
				weapon = {
					name: 'Counter Sword',
					attack: 'LEFT_COMBO_4'
				}
				break
			case EDamageType.CS_JUMP_LEFT:
				weapon = {
					name: 'Counter Sword',
					attack: 'LEFT_JUMP'
				}
				break
			case EDamageType.SEMI_LEFT:
				weapon = {
					name: 'Semi Rifle',
					attack: 'SHOT'
				}
				break
			case EDamageType.BAT_JUMP_AFTER_LEFT:
				weapon = {
					name: 'Storm Bat',
					attack: 'LEFT_AFTER_JUMP'
				}
				break
			case EDamageType.BAT_RIGHT:
				weapon = {
					name: 'Storm Bat',
					attack: 'RIGHT'
				}
				break
			case EDamageType.BAT_LEFT:
				weapon = {
					name: 'Storm Bat',
					attack: 'LEFT'
				}
				break
			case EDamageType.BAT_JUMP_LEFT_CRIT:
				weapon = {
					name: 'Storm Bat',
					attack: 'LEFT_JUMP_CRIT'
				}
				break
			case EDamageType.BAT_JUMP_LEFT:
				weapon = {
					name: 'Storm Bat',
					attack: 'LEFT_JUMP'
				}
				break
			case EDamageType.KATANA_LEFT:
				weapon = {
					name: 'Katana',
					attack: 'LEFT'
				}
				break
			case EDamageType.KATANA_LEFT_COMBO_1:
				weapon = {
					name: 'Katana',
					attack: 'LEFT_COMBO_1'
				}
				break
			case EDamageType.KATANA_LEFT_COMBO_2:
				weapon = {
					name: 'Katana',
					attack: 'LEFT_COMBO_2'
				}
				break
			case EDamageType.KATANA_LEFT_COMBO_3:
				weapon = {
					name: 'Katana',
					attack: 'LEFT_COMBO_3'
				}
				break
			case EDamageType.KATANA_RIGHT_CRIT:
				weapon = {
					name: 'Katana',
					attack: 'RIGHT_CRIT'
				}
				break
			case EDamageType.KATANA_RIGHT:
				weapon = {
					name: 'Katana',
					attack: 'RIGHT'
				}
				break
			case EDamageType.CARD_GUN_LEFT:
				weapon = {
					name: 'Card Gun',
					attack: 'LEFT'
				}
				break
			case EDamageType.CARG_GUN_LEFT_LONG:
				weapon = {
					name: 'Card Gun',
					attack: 'LEFT_LONG'
				}
				break
			case EDamageType.CARD_GUN_LEFT_CRIT:
				weapon = {
					name: 'Card Gun',
					attack: 'LEFT_CRIT'
				}
				break
			case EDamageType.GAUSS_LEFT:
				weapon = {
					name: 'Gauss Rifle',
					attack: 'LEFT'
				}
				break
			case EDamageType.HG_LEFT2:
				weapon = {
					name: 'Hand Gun',
					attack: 'LEFT'
				}
				break
			case EDamageType.HG_LEFT:
				weapon = {
					name: 'Hand Gun',
					attack: 'LEFT'
				}
				break
			case EDamageType.SMASH_LEFT:
				weapon = {
					name: 'Smash Rifle',
					attack: 'LEFT'
				}
				break
			case EDamageType.SMASH_RIGHT:
				weapon = {
					name: 'Smash Rifle',
					attack: 'RIGHT'
				}
				break
			default:
				return false
				break
		}

		weapon.weapons = this.getWeaponByName(weapon.name)

		return weapon
	},
	getWeaponByName: function(name) {
		var found = []

		for (var i = 0; i < weapons.length; ++i) {
			var weapon = weapons[i]
			if(weapon.name === name) {
				found.push(weapon)
			}
		}

		return found
	},
	isAccountBanned: function(account) {
		return account.banned === -1
	},
	validateSession: function(account, session) {
		return !!(account.remoteAddress === session.remoteAddress && account.localAddress === session.localAddress)
	}
}